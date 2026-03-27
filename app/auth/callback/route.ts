import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDb } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data } = await supabase.auth.exchangeCodeForSession(code)
    if (data.user) {
      const db = getDb()
      const email = data.user.email ?? ''
      const name = data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? null
      db.prepare(`
        INSERT INTO profiles (user_id, email, name) VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET email = excluded.email, name = excluded.name
      `).run(data.user.id, email, name)
      // Link any pending challenges where this email was invited
      if (email) {
        db.prepare(`
          UPDATE challenges SET invitee_id = ? WHERE lower(invitee_email) = ? AND invitee_id IS NULL
        `).run(data.user.id, email.toLowerCase())
      }
    }
  }

  const base = process.env.SITE_URL ?? request.url
  return NextResponse.redirect(new URL(next, base))
}
