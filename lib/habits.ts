import type { Database } from 'better-sqlite3'
import type { Habit } from './types'
import { getStreak, getAllStreaks } from './completions'

function addStreak(db: Database, row: unknown): Habit {
  const h = row as Omit<Habit, 'streak'>
  return { ...h, streak: getStreak(db, h.id) }
}

export function listHabits(db: Database, userId: string): Habit[] {
  const rows = db.prepare('SELECT * FROM habits WHERE user_id = ? ORDER BY sort_order ASC, id ASC').all(userId)
  const streaks = getAllStreaks(db, userId)
  return rows.map(r => {
    const h = r as Omit<Habit, 'streak'>
    return { ...h, streak: streaks.get(h.id) ?? 0 }
  })
}

export function createHabit(db: Database, userId: string, name: string, goal: number, color?: string | null): Habit {
  const created_at = new Date().toISOString().split('T')[0]
  const maxOrder = (db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM habits WHERE user_id = ?').get(userId) as { m: number }).m
  const result = db
    .prepare('INSERT INTO habits (user_id, name, goal, color, created_at, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
    .run(userId, name.trim(), goal, color ?? null, created_at, maxOrder + 1)
  const row = db.prepare('SELECT * FROM habits WHERE id = ?').get(result.lastInsertRowid)
  return addStreak(db, row)
}

export function findHabit(db: Database, id: number, userId: string): Habit | undefined {
  const row = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(id, userId)
  return row ? addStreak(db, row) : undefined
}

export function updateHabit(db: Database, id: number, userId: string, name: string, goal: number, color?: string | null): Habit | undefined {
  if (!findHabit(db, id, userId)) return undefined
  db.prepare('UPDATE habits SET name = ?, goal = ?, color = ? WHERE id = ? AND user_id = ?').run(name.trim(), goal, color ?? null, id, userId)
  return findHabit(db, id, userId)
}

export function reorderHabits(db: Database, userId: string, ids: number[]): void {
  const update = db.prepare('UPDATE habits SET sort_order = ? WHERE id = ? AND user_id = ?')
  const tx = db.transaction(() => {
    ids.forEach((id, index) => update.run(index, id, userId))
  })
  tx()
}

export function deleteHabit(db: Database, id: number, userId: string): boolean {
  if (!findHabit(db, id, userId)) return false
  db.prepare('DELETE FROM habits WHERE id = ? AND user_id = ?').run(id, userId)
  return true
}
