import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const row = db.prepare('SELECT time, days, timezone, enabled FROM notification_schedules WHERE user_id = ?').get(session.user.id) as {
    time: string; days: string; timezone: string; enabled: number
  } | undefined

  return NextResponse.json(row ?? { time: '09:00', days: '1,2,3,4,5', timezone: 'UTC', enabled: 0 })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { time, days, timezone, enabled } = await request.json()
  const db = getDb()

  db.prepare(`
    INSERT INTO notification_schedules (user_id, time, days, timezone, enabled)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET time = excluded.time, days = excluded.days, timezone = excluded.timezone, enabled = excluded.enabled
  `).run(session.user.id, time, days, timezone, enabled ? 1 : 0)

  return NextResponse.json({ ok: true })
}
