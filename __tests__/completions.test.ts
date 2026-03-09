import { describe, it, expect, beforeEach } from 'vitest'
import type { Database } from 'better-sqlite3'
import { createTestDb } from './helpers'
import { createHabit, deleteHabit } from '../lib/habits'
import { listCompletions, toggleCompletion } from '../lib/completions'

let db: Database

beforeEach(() => {
  db = createTestDb()
  createHabit(db, 'Exercise', 30) // id=1
  createHabit(db, 'Read', 20)     // id=2
})

describe('listCompletions', () => {
  it('returns empty array when no completions', () => {
    expect(listCompletions(db)).toEqual([])
  })

  it('filters by date range', () => {
    toggleCompletion(db, 1, '2026-03-07')
    toggleCompletion(db, 1, '2026-03-09')
    toggleCompletion(db, 1, '2026-03-11')

    const results = listCompletions(db, '2026-03-07', '2026-03-10')
    expect(results).toHaveLength(2)
  })

  it('returns all completions when no range given', () => {
    toggleCompletion(db, 1, '2026-03-07')
    toggleCompletion(db, 2, '2026-03-09')
    expect(listCompletions(db)).toHaveLength(2)
  })
})

describe('toggleCompletion', () => {
  it('creates a completion and returns created=true', () => {
    const result = toggleCompletion(db, 1, '2026-03-09')
    expect(result.created).toBe(true)
    expect(result.completion?.habit_id).toBe(1)
    expect(result.completion?.date).toBe('2026-03-09')
  })

  it('deletes existing completion and returns created=false', () => {
    toggleCompletion(db, 1, '2026-03-09')
    const result = toggleCompletion(db, 1, '2026-03-09')
    expect(result.created).toBe(false)
    expect(result.completion).toBeUndefined()
    expect(listCompletions(db)).toHaveLength(0)
  })

  it('allows same date for different habits', () => {
    toggleCompletion(db, 1, '2026-03-09')
    toggleCompletion(db, 2, '2026-03-09')
    expect(listCompletions(db)).toHaveLength(2)
  })

  it('cascades delete when habit is deleted', () => {
    toggleCompletion(db, 1, '2026-03-09')
    deleteHabit(db, 1)
    expect(listCompletions(db)).toHaveLength(0)
  })
})
