import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDb } from '@/lib/db'
import { listHabits } from '@/lib/habits'

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const habits = listHabits(db, session.user.id)

  const goalsReached = habits.filter(h => h.completed_days >= h.goal).length
  const mostAmbitious = habits.length > 0
    ? habits.reduce((a, b) => b.goal > a.goal ? b : a).name
    : null
  const maxStreak = habits.length > 0
    ? Math.max(...habits.map(h => h.streak))
    : 0
  const memberSince = session.user.created_at
    ? new Date(session.user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return NextResponse.json({
    habitsCount: habits.length,
    goalsReached,
    mostAmbitious,
    maxStreak,
    memberSince,
  })
}
