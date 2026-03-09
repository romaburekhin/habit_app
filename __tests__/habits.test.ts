import { describe, it, expect, beforeEach } from 'vitest'
import type { Database } from 'better-sqlite3'
import { createTestDb } from './helpers'
import { listHabits, createHabit, findHabit, deleteHabit, incrementCompletedDays } from '../lib/habits'

let db: Database

beforeEach(() => {
  db = createTestDb()
})

describe('listHabits', () => {
  it('returns empty array when no habits', () => {
    expect(listHabits(db)).toEqual([])
  })

  it('returns all habits ordered by created_at', () => {
    createHabit(db, 'Exercise', 30)
    createHabit(db, 'Read', 20)
    const habits = listHabits(db)
    expect(habits).toHaveLength(2)
    expect(habits[0].name).toBe('Exercise')
    expect(habits[1].name).toBe('Read')
  })

  it('includes completed_days starting at 0', () => {
    createHabit(db, 'Exercise', 30)
    expect(listHabits(db)[0].completed_days).toBe(0)
  })
})

describe('createHabit', () => {
  it('creates a habit and returns it', () => {
    const habit = createHabit(db, 'Exercise', 30)
    expect(habit.id).toBe(1)
    expect(habit.name).toBe('Exercise')
    expect(habit.goal).toBe(30)
    expect(habit.completed_days).toBe(0)
    expect(habit.created_at).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('trims whitespace from name', () => {
    const habit = createHabit(db, '  Exercise  ', 7)
    expect(habit.name).toBe('Exercise')
  })
})

describe('findHabit', () => {
  it('returns habit by id', () => {
    const created = createHabit(db, 'Exercise', 30)
    const found = findHabit(db, created.id)
    expect(found).toEqual(created)
  })

  it('returns undefined for unknown id', () => {
    expect(findHabit(db, 999)).toBeUndefined()
  })
})

describe('incrementCompletedDays', () => {
  it('increments on every call', () => {
    const habit = createHabit(db, 'Exercise', 30)
    incrementCompletedDays(db, habit.id)
    incrementCompletedDays(db, habit.id)
    const updated = incrementCompletedDays(db, habit.id)
    expect(updated?.completed_days).toBe(3)
  })

  it('returns undefined for non-existent habit', () => {
    expect(incrementCompletedDays(db, 999)).toBeUndefined()
  })
})

describe('deleteHabit', () => {
  it('deletes an existing habit and returns true', () => {
    const habit = createHabit(db, 'Exercise', 30)
    expect(deleteHabit(db, habit.id)).toBe(true)
    expect(listHabits(db)).toHaveLength(0)
  })

  it('returns false for non-existent habit', () => {
    expect(deleteHabit(db, 999)).toBe(false)
  })
})
