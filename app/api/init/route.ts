import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { listHabits } from '@/lib/habits'
import { listCompletions } from '@/lib/completions'
import { createClient } from '@/lib/supabase/server'

function getWeekBounds(): { from: string; to: string } {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    from: monday.toISOString().slice(0, 10),
    to: sunday.toISOString().slice(0, 10),
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()

  // Keep profile in sync on every load
  const email = session.user.email ?? ''
  const name = session.user.user_metadata?.full_name ?? session.user.user_metadata?.name ?? null
  db.prepare(`
    INSERT INTO profiles (user_id, email, name) VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET email = excluded.email, name = excluded.name
  `).run(session.user.id, email, name)

  const { from, to } = getWeekBounds()
  const [habits, completions] = [
    listHabits(db, session.user.id),
    listCompletions(db, session.user.id, from, to),
  ]

  return NextResponse.json({ habits, completions })
}
