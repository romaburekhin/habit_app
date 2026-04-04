import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { sendPush } from '@/lib/webPush'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const db = getDb()

  const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(Number(id)) as Record<string, unknown> | undefined
  if (!challenge) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { action } = body

  if (action === 'accept') {
    const isInvitee = challenge.invitee_id === session.user.id || challenge.invitee_email === session.user.email
    if (!isInvitee) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Copy the inviter's habit for the invitee
    const inviterHabit = db.prepare('SELECT * FROM habits WHERE id = ?').get(challenge.inviter_habit_id) as Record<string, unknown> | undefined
    if (!inviterHabit) return NextResponse.json({ error: 'Original habit not found' }, { status: 404 })

    const created_at = new Date().toISOString().slice(0, 10)
    const result = db.prepare(
      'INSERT INTO habits (user_id, name, goal, color, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(session.user.id, inviterHabit.name, inviterHabit.goal, inviterHabit.color ?? null, created_at)

    db.prepare(`
      UPDATE challenges SET status = 'accepted', invitee_id = ?, invitee_habit_id = ? WHERE id = ?
    `).run(session.user.id, result.lastInsertRowid, Number(id))

    // Notify inviter
    const inviteeProfile = db.prepare('SELECT name, email FROM profiles WHERE user_id = ?').get(session.user.id) as { name: string | null; email: string } | undefined
    const inviteeName = inviteeProfile?.name?.split(' ')[0] ?? inviteeProfile?.email ?? 'Someone'
    sendPush(challenge.inviter_id as string, 'Challenge Accepted', `${inviteeName} accepted your Challenge`).catch(() => {})
  } else if (action === 'decline') {
    const isInvitee = challenge.invitee_id === session.user.id || challenge.invitee_email === session.user.email
    const isInviter = challenge.inviter_id === session.user.id
    if (!isInvitee && !isInviter) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    db.prepare(`UPDATE challenges SET status = 'declined' WHERE id = ?`).run(Number(id))
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const updated = db.prepare('SELECT * FROM challenges WHERE id = ?').get(Number(id))
  return NextResponse.json(updated)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const db = getDb()

  const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(Number(id)) as Record<string, unknown> | undefined
  if (!challenge) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isInviter = challenge.inviter_id === session.user.id
  const isInvitee = challenge.invitee_id === session.user.id || challenge.invitee_email === session.user.email
  if (!isInviter && !isInvitee) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Delete the invitee's auto-copied habit if the challenge was accepted
  if (challenge.status === 'accepted' && challenge.invitee_habit_id) {
    db.prepare('DELETE FROM habits WHERE id = ?').run(challenge.invitee_habit_id)
  }

  db.prepare('DELETE FROM challenges WHERE id = ?').run(Number(id))

  // Notify the other party if challenge was active
  if (challenge.status === 'accepted') {
    const leaverProfile = db.prepare('SELECT name, email FROM profiles WHERE user_id = ?').get(session.user.id) as { name: string | null; email: string } | undefined
    const leaverName = leaverProfile?.name?.split(' ')[0] ?? leaverProfile?.email ?? 'Someone'
    const otherUserId = isInviter ? challenge.invitee_id as string : challenge.inviter_id as string
    if (otherUserId) {
      sendPush(otherUserId, 'Challenge Ended', `${leaverName} left the Challenge`).catch(() => {})
    }
  }

  return NextResponse.json({ ok: true })
}
