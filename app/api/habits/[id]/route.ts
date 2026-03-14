import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { deleteHabit, updateHabit } from '@/lib/habits'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const db = getDb()
  const habit = updateHabit(db, Number(id), session.user.id, body.name, Number(body.goal), body.color ?? null)
  if (!habit) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(habit)
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const db = getDb()
  const deleted = deleteHabit(db, Number(id), session.user.id)

  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return new NextResponse(null, { status: 204 })
}
