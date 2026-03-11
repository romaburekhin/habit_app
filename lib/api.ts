import type { Habit, Completion } from './types'

export async function fetchHabits(): Promise<Habit[]> {
  const res = await fetch('/api/habits')
  if (!res.ok) throw new Error('Failed to fetch habits')
  return res.json()
}

export async function createHabit(name: string, goal: number, color?: string | null): Promise<Habit> {
  const res = await fetch('/api/habits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, goal, color: color ?? null }),
  })
  if (!res.ok) throw new Error('Failed to create habit')
  return res.json()
}

export async function incrementHabitDays(id: number): Promise<Habit> {
  const res = await fetch(`/api/habits/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ increment_days: true }),
  })
  if (!res.ok) throw new Error('Failed to increment completed days')
  return res.json()
}

export async function updateHabit(id: number, name: string, goal: number, color?: string | null): Promise<Habit> {
  const res = await fetch(`/api/habits/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, goal, color: color ?? null }),
  })
  if (!res.ok) throw new Error('Failed to update habit')
  return res.json()
}

export async function deleteHabit(id: number): Promise<void> {
  const res = await fetch(`/api/habits/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete habit')
}

export async function fetchCompletions(from: string, to: string): Promise<Completion[]> {
  const res = await fetch(`/api/completions?from=${from}&to=${to}`)
  if (!res.ok) throw new Error('Failed to fetch completions')
  return res.json()
}

export async function toggleCompletion(
  habit_id: number,
  date: string
): Promise<{ created: boolean; completion: Completion | null; habit: Habit }> {
  const res = await fetch('/api/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ habit_id, date }),
  })
  if (!res.ok) throw new Error('Failed to toggle completion')
  return res.json()
}
