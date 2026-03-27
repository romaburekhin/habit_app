import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'

function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const db = getDb()

  const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(Number(id)) as Record<string, unknown> | undefined
  if (!challenge) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isInviter = challenge.inviter_id === session.user.id
  const isInvitee = challenge.invitee_id === session.user.id
  if (!isInviter && !isInvitee) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (challenge.status !== 'accepted') return NextResponse.json({ my_completions: [], their_completions: [] })

  const myHabitId = isInviter ? challenge.inviter_habit_id : challenge.invitee_habit_id
  const theirHabitId = isInviter ? challenge.invitee_habit_id : challenge.inviter_habit_id

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const from = new Date(today)
  from.setDate(today.getDate() - 364)
  const fromStr = toLocalDate(from)
  const toStr = toLocalDate(today)

  const myRows = db.prepare('SELECT date FROM completions WHERE habit_id = ? AND date >= ? AND date <= ?').all(myHabitId, fromStr, toStr) as { date: string }[]
  const theirRows = db.prepare('SELECT date FROM completions WHERE habit_id = ? AND date >= ? AND date <= ?').all(theirHabitId, fromStr, toStr) as { date: string }[]

  return NextResponse.json({
    my_completions: myRows.map(r => r.date),
    their_completions: theirRows.map(r => r.date),
  })
}
