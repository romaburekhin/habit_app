import type { Database } from 'better-sqlite3'
import type { Habit } from './types'

export function listHabits(db: Database): Habit[] {
  return db.prepare('SELECT * FROM habits ORDER BY created_at ASC').all() as Habit[]
}

export function createHabit(db: Database, name: string, goal: number): Habit {
  const created_at = new Date().toISOString().split('T')[0]
  const result = db
    .prepare('INSERT INTO habits (name, goal, created_at) VALUES (?, ?, ?)')
    .run(name.trim(), goal, created_at)
  return db.prepare('SELECT * FROM habits WHERE id = ?').get(result.lastInsertRowid) as Habit
}

export function findHabit(db: Database, id: number): Habit | undefined {
  return db.prepare('SELECT * FROM habits WHERE id = ?').get(id) as Habit | undefined
}

export function incrementCompletedDays(db: Database, id: number): Habit | undefined {
  const habit = findHabit(db, id)
  if (!habit) return undefined
  db.prepare('UPDATE habits SET completed_days = completed_days + 1 WHERE id = ?').run(id)
  return db.prepare('SELECT * FROM habits WHERE id = ?').get(id) as Habit
}

export function updateHabit(db: Database, id: number, name: string, goal: number): Habit | undefined {
  if (!findHabit(db, id)) return undefined
  db.prepare('UPDATE habits SET name = ?, goal = ? WHERE id = ?').run(name.trim(), goal, id)
  return db.prepare('SELECT * FROM habits WHERE id = ?').get(id) as Habit
}

export function updateGoal(db: Database, id: number, goal: number): Habit | undefined {
  const habit = findHabit(db, id)
  if (!habit) return undefined
  db.prepare('UPDATE habits SET goal = ? WHERE id = ?').run(goal, id)
  return db.prepare('SELECT * FROM habits WHERE id = ?').get(id) as Habit
}

export function deleteHabit(db: Database, id: number): boolean {
  if (!findHabit(db, id)) return false
  db.prepare('DELETE FROM habits WHERE id = ?').run(id)
  return true
}
