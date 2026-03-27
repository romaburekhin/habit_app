import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { sendPush } from '@/lib/webPush'

// Called by a cron job every minute: GET /api/push/reminders?secret=...
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = getDb()
  const schedules = db.prepare(`
    SELECT user_id, time, days, timezone FROM notification_schedules WHERE enabled = 1
  `).all() as { user_id: string; time: string; days: string; timezone: string }[]

  let sent = 0
  for (const s of schedules) {
    try {
      const now = new Date()
      const tz = s.timezone ?? 'UTC'
      // Get HH:MM in the user's timezone
      const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false })
      const parts = formatter.formatToParts(now)
      const hh = parts.find(p => p.type === 'hour')?.value ?? '00'
      const mm = parts.find(p => p.type === 'minute')?.value ?? '00'
      const localTime = `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}`

      // Day of week in user's timezone (0=Sun, 1=Mon … 6=Sat)
      const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' })
      const dayShort = dayFormatter.format(now) // "Mon", "Tue" …
      const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
      const localDay = dayMap[dayShort] ?? -1

      const scheduledDays = s.days.split(',').map(Number)
      if (localTime === s.time && scheduledDays.includes(localDay)) {
        await sendPush(s.user_id, 'Time to check in!', 'Don\'t forget to track your habits today.')
        sent++
      }
    } catch {
      // skip failed timezone lookups
    }
  }

  return NextResponse.json({ sent })
}
