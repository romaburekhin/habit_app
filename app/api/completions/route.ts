import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { listCompletions, toggleCompletion } from '@/lib/completions'

export function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from') ?? undefined
  const to = searchParams.get('to') ?? undefined

  const completions = listCompletions(getDb(), from, to)
  return NextResponse.json(completions)
}

export async function POST(request: Request) {
  const { habit_id, date } = await request.json()

  if (!habit_id || !date) {
    return NextResponse.json({ error: 'habit_id and date are required' }, { status: 400 })
  }

  const { created, completion } = toggleCompletion(getDb(), habit_id, date)

  if (!created) {
    return new NextResponse(null, { status: 204 })
  }

  return NextResponse.json(completion, { status: 201 })
}
