import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { sendPush } from '@/lib/webPush'
import type { ChallengeView } from '@/lib/types'

function buildView(row: Record<string, unknown>, userId: string): ChallengeView {
  const isInviter = row.inviter_id === userId
  const myHabitId = isInviter ? row.inviter_habit_id : row.invitee_habit_id
  const theirHabitId = isInviter ? row.invitee_habit_id : row.inviter_habit_id

  return {
    id: row.id as number,
    status: row.status as 'pending' | 'accepted' | 'declined',
    created_at: row.created_at as string,
    role: isInviter ? 'inviter' : 'invitee',
    my_habit: myHabitId ? {
      id: (isInviter ? row.ih_id : row.eh_id) as number,
      name: (isInviter ? row.ih_name : row.eh_name) as string,
      color: (isInviter ? row.ih_color : row.eh_color) as string | null,
      goal: (isInviter ? row.ih_goal : row.eh_goal) as number,
      completed_days: (isInviter ? row.ih_completed : row.eh_completed) as number,
    } : null,
    their_habit: theirHabitId ? {
      id: (isInviter ? row.eh_id : row.ih_id) as number,
      name: (isInviter ? row.eh_name : row.ih_name) as string,
      color: (isInviter ? row.eh_color : row.ih_color) as string | null,
      goal: (isInviter ? row.eh_goal : row.ih_goal) as number,
      completed_days: (isInviter ? row.eh_completed : row.ih_completed) as number,
    } : null,
    their_email: isInviter ? (row.invitee_email as string) : (row.inviter_email as string ?? ''),
    their_name: isInviter ? (row.invitee_name as string | null) : (row.inviter_name as string | null),
    description: row.description as string | null,
    period_end: row.period_end as string | null,
    start_date: row.start_date as string | null,
    update_proposal: row.update_proposal ? JSON.parse(row.update_proposal as string) : null,
    i_proposed_update: !!row.update_proposal && row.update_proposed_by === userId,
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const rows = db.prepare(`
    SELECT
      c.id, c.inviter_id, c.invitee_email, c.invitee_id,
      c.inviter_habit_id, c.invitee_habit_id, c.status, c.created_at,
      c.description, c.period_end, c.start_date,
      c.update_proposal, c.update_proposed_by,
      ih.id AS ih_id, ih.name AS ih_name, ih.color AS ih_color,
        ih.goal AS ih_goal, ih.completed_days AS ih_completed,
      eh.id AS eh_id, eh.name AS eh_name, eh.color AS eh_color,
        eh.goal AS eh_goal, eh.completed_days AS eh_completed,
      ip.email AS inviter_email, ip.name AS inviter_name,
      ep.email AS invitee_profile_email, ep.name AS invitee_name
    FROM challenges c
    LEFT JOIN habits ih ON ih.id = c.inviter_habit_id
    LEFT JOIN habits eh ON eh.id = c.invitee_habit_id
    LEFT JOIN profiles ip ON ip.user_id = c.inviter_id
    LEFT JOIN profiles ep ON ep.user_id = c.invitee_id
    WHERE (c.inviter_id = ? OR c.invitee_id = ?)
      AND c.status != 'declined'
    ORDER BY c.created_at DESC
  `).all(session.user.id, session.user.id) as Record<string, unknown>[]

  return NextResponse.json(rows.map(r => buildView(r, session.user.id)))
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, description, color, periodEnd, startDate, days, inviteeEmail } = body
  if (!name?.trim() || !inviteeEmail || !periodEnd || !days) {
    return NextResponse.json({ error: 'name, inviteeEmail, periodEnd and days are required' }, { status: 400 })
  }

  const db = getDb()
  const created_at = new Date().toISOString().slice(0, 10)

  try {
    // Create the inviter's habit inline
    const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM habits WHERE user_id = ?').get(session.user.id) as { m: number | null }).m ?? 0
    const habitResult = db.prepare(`
      INSERT INTO habits (user_id, name, goal, completed_days, color, created_at, sort_order)
      VALUES (?, ?, ?, 0, ?, ?, ?)
    `).run(session.user.id, name.trim(), days, color ?? null, created_at, maxOrder + 1)
    const habit_id = habitResult.lastInsertRowid

    // Look up invitee
    const invitee = db.prepare('SELECT user_id FROM profiles WHERE lower(email) = ?').get(inviteeEmail.toLowerCase()) as { user_id: string } | undefined

    const result = db.prepare(`
      INSERT INTO challenges (inviter_id, invitee_email, invitee_id, inviter_habit_id, status, created_at, description, period_end, start_date)
      VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)
    `).run(session.user.id, inviteeEmail.toLowerCase(), invitee?.user_id ?? null, habit_id, created_at, description?.trim() || null, periodEnd, startDate ?? null)

    const created = db.prepare('SELECT * FROM challenges WHERE id = ?').get(result.lastInsertRowid)

    if (invitee?.user_id) {
      const inviterProfile = db.prepare('SELECT name, email FROM profiles WHERE user_id = ?').get(session.user.id) as { name: string | null; email: string } | undefined
      const inviterName = inviterProfile?.name?.split(' ')[0] ?? inviterProfile?.email ?? 'Someone'
      sendPush(invitee.user_id, 'New Challenge', `${inviterName} challenged you: ${name.trim()}`).catch(() => {})
    }

    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    console.error('[POST /api/challenges]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
