import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { deleteHabit, updateHabit, incrementCompletedDays } from '@/lib/habits'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const numId = Number(id)

  if (body.increment_days) {
    const habit = incrementCompletedDays(getDb(), numId)
    if (!habit) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(habit)
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const habit = updateHabit(getDb(), numId, body.name, Number(body.goal))
  if (!habit) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(habit)
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const deleted = deleteHabit(getDb(), Number(id))

  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return new NextResponse(null, { status: 204 })
}
