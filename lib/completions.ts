import type { Database } from 'better-sqlite3'
import type { Completion } from './types'

export function listCompletions(db: Database, from?: string, to?: string): Completion[] {
  if (from && to) {
    return db
      .prepare('SELECT * FROM completions WHERE date >= ? AND date <= ?')
      .all(from, to) as Completion[]
  }
  return db.prepare('SELECT * FROM completions').all() as Completion[]
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
    return { created: false }
  }

  const result = db
    .prepare('INSERT INTO completions (habit_id, date) VALUES (?, ?)')
    .run(habit_id, date)
  const completion = db
    .prepare('SELECT * FROM completions WHERE id = ?')
    .get(result.lastInsertRowid) as Completion

  return { created: true, completion }
}
