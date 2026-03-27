import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')?.trim().toLowerCase()
  if (!email || email.length < 2) return NextResponse.json([])

  const db = getDb()
  const rows = db.prepare(
    `SELECT user_id, email, name FROM profiles
     WHERE lower(email) LIKE ? AND user_id != ?
     LIMIT 5`
  ).all(`%${email}%`, session.user.id)

  return NextResponse.json(rows)
}
