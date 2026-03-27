import type { Habit, Completion, Profile, ChallengeView } from './types'

export async function fetchHabits(): Promise<Habit[]> {
  const res = await fetch('/api/habits')
  if (!res.ok) throw new Error('Failed to fetch habits')
  return res.json()
}

export async function fetchInit(): Promise<{ habits: Habit[]; completions: Completion[] }> {
  const res = await fetch('/api/init')
  if (!res.ok) throw new Error('Failed to fetch init data')
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

export async function reorderHabits(ids: number[]): Promise<void> {
  await fetch('/api/habits/reorder', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
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

export async function searchUsers(email: string): Promise<Profile[]> {
  const res = await fetch(`/api/users/search?email=${encodeURIComponent(email)}`)
  if (!res.ok) throw new Error('Failed to search users')
  return res.json()
}

export async function fetchChallenges(): Promise<ChallengeView[]> {
  const res = await fetch('/api/challenges')
  if (!res.ok) throw new Error('Failed to fetch challenges')
  return res.json()
}

export async function createChallenge(habit_id: number, invitee_email: string): Promise<void> {
  const res = await fetch('/api/challenges', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ habit_id, invitee_email }),
  })
  if (!res.ok) throw new Error('Failed to create challenge')
}

export async function respondToChallenge(id: number, action: 'accept' | 'decline'): Promise<void> {
  const res = await fetch(`/api/challenges/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  })
  if (!res.ok) throw new Error('Failed to respond to challenge')
}

export async function deleteChallenge(id: number): Promise<void> {
  const res = await fetch(`/api/challenges/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete challenge')
}

export async function fetchChallengeCompletions(id: number): Promise<{ my_completions: string[]; their_completions: string[] }> {
  const res = await fetch(`/api/challenges/${id}/completions`)
  if (!res.ok) throw new Error('Failed to fetch challenge completions')
  return res.json()
}
