import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { listHabits, createHabit } from '@/lib/habits'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  return NextResponse.json(listHabits(db, session.user.id))
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, goal } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const parsedGoal = Number(goal)
  if (!parsedGoal || parsedGoal < 1) {
    return NextResponse.json({ error: 'Goal must be a positive number' }, { status: 400 })
  }

  const db = getDb()
  const habit = createHabit(db, session.user.id, name, parsedGoal, body.color ?? null)
  return NextResponse.json(habit, { status: 201 })
}
