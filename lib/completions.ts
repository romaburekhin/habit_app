import type { Database } from 'better-sqlite3'
import type { Completion } from './types'

export function listCompletions(db: Database, userId: string, from?: string, to?: string): Completion[] {
  if (from && to) {
    return db
      .prepare(`SELECT c.* FROM completions c
        JOIN habits h ON h.id = c.habit_id
        WHERE h.user_id = ? AND c.date >= ? AND c.date <= ?`)
      .all(userId, from, to) as Completion[]
  }
  return db
    .prepare(`SELECT c.* FROM completions c JOIN habits h ON h.id = c.habit_id WHERE h.user_id = ?`)
    .all(userId) as Completion[]
}

export function computeStreak(dates: Set<string>): number {
  if (dates.size === 0) return 0

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  const anchor = dates.has(today) ? today : dates.has(yesterdayStr) ? yesterdayStr : null
  if (!anchor) return 0

  let streak = 0
  const d = new Date(anchor + 'T12:00:00')
  while (dates.has(d.toISOString().slice(0, 10))) {
    streak++
    d.setDate(d.getDate() - 1)
  }

  const fwd = new Date(anchor + 'T12:00:00')
  fwd.setDate(fwd.getDate() + 1)
  while (dates.has(fwd.toISOString().slice(0, 10))) {
    streak++
    fwd.setDate(fwd.getDate() + 1)
  }

  return streak
}

export function getStreak(db: Database, habit_id: number): number {
  const rows = db
    .prepare('SELECT date FROM completions WHERE habit_id = ?')
    .all(habit_id) as { date: string }[]
  return computeStreak(new Set(rows.map(r => r.date)))
}

export function getAllStreaks(db: Database, userId: string): Map<number, number> {
  const rows = db
    .prepare(`SELECT c.habit_id, c.date FROM completions c
      JOIN habits h ON h.id = c.habit_id WHERE h.user_id = ?`)
    .all(userId) as { habit_id: number; date: string }[]

  const byHabit = new Map<number, Set<string>>()
  for (const row of rows) {
    if (!byHabit.has(row.habit_id)) byHabit.set(row.habit_id, new Set())
    byHabit.get(row.habit_id)!.add(row.date)
  }

  const result = new Map<number, number>()
  for (const [id, dates] of byHabit) {
    result.set(id, computeStreak(dates))
  }
  return result
}

export function toggleCompletion(
  db: Database,
  habit_id: number,
  date: string
): { created: boolean; completion?: Completion } {
  const existing = db
    .prepare('SELECT * FROM completions WHERE habit_id = ? AND date = ?')
    .get(habit_id, date)

  if (existing) {
    db.prepare('DELETE FROM completions WHERE habit_id = ? AND date = ?').run(habit_id, date)
    db.prepare('UPDATE habits SET completed_days = MAX(0, completed_days - 1) WHERE id = ?').run(habit_id)
    return { created: false }
  }

  const result = db
    .prepare('INSERT INTO completions (habit_id, date) VALUES (?, ?)')
    .run(habit_id, date)
  const completion = db
    .prepare('SELECT * FROM completions WHERE id = ?')
    .get(result.lastInsertRowid) as Completion
  db.prepare('UPDATE habits SET completed_days = completed_days + 1 WHERE id = ?').run(habit_id)
  return { created: true, completion }
}
