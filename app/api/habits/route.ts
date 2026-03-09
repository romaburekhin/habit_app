import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { listHabits, createHabit } from '@/lib/habits'

export function GET() {
  const habits = listHabits(getDb())
  return NextResponse.json(habits)
}

export async function POST(request: Request) {
  const { name, goal } = await request.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const parsedGoal = Number(goal)
  if (!parsedGoal || parsedGoal < 1) {
    return NextResponse.json({ error: 'Goal must be a positive number' }, { status: 400 })
  }

  const habit = createHabit(getDb(), name, parsedGoal)
  return NextResponse.json(habit, { status: 201 })
}
