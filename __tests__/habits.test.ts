import { describe, it, expect, beforeEach } from 'vitest'
import type { Database } from 'better-sqlite3'
import { createTestDb, createTestUser } from './helpers'
import { listHabits, createHabit, findHabit, deleteHabit } from '../lib/habits'

let db: Database
let userId: string

beforeEach(() => {
  db = createTestDb()
  userId = createTestUser()
})

describe('listHabits', () => {
  it('returns empty array when no habits', () => {
    expect(listHabits(db, userId)).toEqual([])
  })

  it('returns all habits ordered by created_at', () => {
    createHabit(db, userId, 'Exercise', 30)
    createHabit(db, userId, 'Read', 20)
    const habits = listHabits(db, userId)
    expect(habits).toHaveLength(2)
    expect(habits[0].name).toBe('Exercise')
    expect(habits[1].name).toBe('Read')
  })

  it('includes completed_days starting at 0', () => {
    createHabit(db, userId, 'Exercise', 30)
    expect(listHabits(db, userId)[0].completed_days).toBe(0)
  })
})

describe('createHabit', () => {
  it('creates a habit and returns it', () => {
    const habit = createHabit(db, userId, 'Exercise', 30)
    expect(habit.id).toBe(1)
    expect(habit.name).toBe('Exercise')
    expect(habit.goal).toBe(30)
    expect(habit.completed_days).toBe(0)
    expect(habit.created_at).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('trims whitespace from name', () => {
    const habit = createHabit(db, userId, '  Exercise  ', 7)
    expect(habit.name).toBe('Exercise')
  })
})

describe('findHabit', () => {
  it('returns habit by id', () => {
    const created = createHabit(db, userId, 'Exercise', 30)
    const found = findHabit(db, created.id, userId)
    expect(found).toEqual(created)
  })

  it('returns undefined for unknown id', () => {
    expect(findHabit(db, 999, userId)).toBeUndefined()
  })
})

describe('deleteHabit', () => {
  it('deletes an existing habit and returns true', () => {
    const habit = createHabit(db, userId, 'Exercise', 30)
    expect(deleteHabit(db, habit.id, userId)).toBe(true)
    expect(listHabits(db, userId)).toHaveLength(0)
  })

  it('returns false for non-existent habit', () => {
    expect(deleteHabit(db, 999, userId)).toBe(false)
  })
})
