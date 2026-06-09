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
    const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM habits WHERE user_id = ?').get(session.user.id) as { m: number | null }).m ?? 0
    const result = db.prepare(
      'INSERT INTO habits (user_id, name, goal, color, created_at, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(session.user.id, inviterHabit.name, inviterHabit.goal, inviterHabit.color ?? null, created_at, maxOrder + 1)

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
  } else if (action === 'propose_update') {
    const isParticipant = challenge.inviter_id === session.user.id || challenge.invitee_id === session.user.id
    if (!isParticipant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { name, description, periodEnd, startDate, days } = body
    db.prepare('UPDATE challenges SET update_proposal = ?, update_proposed_by = ? WHERE id = ?')
      .run(JSON.stringify({ name, description, periodEnd, startDate: startDate ?? null, days }), session.user.id, Number(id))
    // Notify the other party
    const proposerProfile = db.prepare('SELECT name, email FROM profiles WHERE user_id = ?').get(session.user.id) as { name: string | null; email: string } | undefined
    const proposerName = proposerProfile?.name?.split(' ')[0] ?? proposerProfile?.email ?? 'Someone'
    const otherId = challenge.inviter_id === session.user.id ? challenge.invitee_id as string | null : challenge.inviter_id as string
    if (otherId) sendPush(otherId, 'Challenge Updated', `${proposerName} proposed changes to the challenge`).catch(() => {})

  } else if (action === 'accept_update') {
    const isParticipant = challenge.inviter_id === session.user.id || challenge.invitee_id === session.user.id
    if (!isParticipant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (!challenge.update_proposal) return NextResponse.json({ error: 'No pending update' }, { status: 400 })
    const proposal = JSON.parse(challenge.update_proposal as string) as { name: string; description: string; periodEnd: string; startDate: string | null; days: number }
    db.prepare('UPDATE challenges SET description = ?, period_end = ?, start_date = ?, update_proposal = NULL, update_proposed_by = NULL WHERE id = ?')
      .run(proposal.description ?? null, proposal.periodEnd, proposal.startDate ?? null, Number(id))
    if (challenge.inviter_habit_id) db.prepare('UPDATE habits SET name = ?, goal = ? WHERE id = ?').run(proposal.name, proposal.days, challenge.inviter_habit_id)
    if (challenge.invitee_habit_id) db.prepare('UPDATE habits SET name = ?, goal = ? WHERE id = ?').run(proposal.name, proposal.days, challenge.invitee_habit_id)

  } else if (action === 'decline_update') {
    const isParticipant = challenge.inviter_id === session.user.id || challenge.invitee_id === session.user.id
    if (!isParticipant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    db.prepare('UPDATE challenges SET update_proposal = NULL, update_proposed_by = NULL WHERE id = ?').run(Number(id))

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

  // Delete habits: invitee's copy always; inviter's habit if they're the one leaving (it was auto-created)
  if (challenge.status === 'accepted' && challenge.invitee_habit_id) {
    db.prepare('DELETE FROM habits WHERE id = ?').run(challenge.invitee_habit_id)
  }
  if (isInviter && challenge.inviter_habit_id) {
    db.prepare('DELETE FROM habits WHERE id = ?').run(challenge.inviter_habit_id)
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
