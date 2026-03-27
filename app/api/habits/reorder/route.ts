import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { reorderHabits } from '@/lib/habits'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await request.json()
  if (!Array.isArray(ids) || ids.some(id => typeof id !== 'number')) {
    return NextResponse.json({ error: 'Invalid ids' }, { status: 400 })
  }

  reorderHabits(getDb(), session.user.id, ids)
  return NextResponse.json({ ok: true })
}
