import type { Database } from 'better-sqlite3'
import type { Habit } from './types'
import { getStreak } from './completions'

function addStreak(db: Database, row: unknown): Habit {
  const h = row as Omit<Habit, 'streak'>
  return { ...h, streak: getStreak(db, h.id) }
}

export function listHabits(db: Database): Habit[] {
  const rows = db.prepare('SELECT * FROM habits ORDER BY created_at ASC').all()
  return rows.map(r => addStreak(db, r))
}

export function createHabit(db: Database, name: string, goal: number, color?: string | null): Habit {
  const created_at = new Date().toISOString().split('T')[0]
  const result = db
    .prepare('INSERT INTO habits (name, goal, color, created_at) VALUES (?, ?, ?, ?)')
    .run(name.trim(), goal, color ?? null, created_at)
  const row = db.prepare('SELECT * FROM habits WHERE id = ?').get(result.lastInsertRowid)
  return addStreak(db, row)
}

export function findHabit(db: Database, id: number): Habit | undefined {
  const row = db.prepare('SELECT * FROM habits WHERE id = ?').get(id)
  return row ? addStreak(db, row) : undefined
}

export function incrementCompletedDays(db: Database, id: number): Habit | undefined {
  if (!findHabit(db, id)) return undefined
  db.prepare('UPDATE habits SET completed_days = completed_days + 1 WHERE id = ?').run(id)
  return findHabit(db, id)
}

export function updateHabit(db: Database, id: number, name: string, goal: number, color?: string | null): Habit | undefined {
  if (!findHabit(db, id)) return undefined
  db.prepare('UPDATE habits SET name = ?, goal = ?, color = ? WHERE id = ?').run(name.trim(), goal, color ?? null, id)
  return findHabit(db, id)
}

export function updateGoal(db: Database, id: number, goal: number): Habit | undefined {
  if (!findHabit(db, id)) return undefined
  db.prepare('UPDATE habits SET goal = ? WHERE id = ?').run(goal, id)
  return findHabit(db, id)
}

export function deleteHabit(db: Database, id: number): boolean {
  if (!findHabit(db, id)) return false
  db.prepare('DELETE FROM habits WHERE id = ?').run(id)
  return true
}
