import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { listCompletions, toggleCompletion } from '@/lib/completions'
import { findHabit } from '@/lib/habits'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from') ?? undefined
  const to = searchParams.get('to') ?? undefined

  const db = getDb()
  const completions = listCompletions(db, session.user.id, from, to)
  return NextResponse.json(completions)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { habit_id, date } = await request.json()

  if (!habit_id || !date) {
    return NextResponse.json({ error: 'habit_id and date are required' }, { status: 400 })
  }

  const db = getDb()
  const { created, completion } = toggleCompletion(db, habit_id, date)
  const habit = findHabit(db, habit_id, session.user.id)

  return NextResponse.json({ created, completion: completion ?? null, habit })
}
