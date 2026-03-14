import './globals.css'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/LogoutButton'
import ProfileButton from '@/components/ProfileButton'

export const metadata = {
  title: 'Habit Tracker',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Habits',
    statusBarStyle: 'black-translucent' as const,
  },
}
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#111827',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const displayName = user?.user_metadata?.name ?? user?.email ?? ''
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0].toUpperCase())
    .join('')

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-lg mx-auto flex items-center justify-between" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingBottom: '0.75rem', paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight">Habit Tracker</h1>
            {user && (
              <div className="flex items-center gap-3">
                <ProfileButton initials={initials} />
                <LogoutButton />
              </div>
            )}
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 sm:px-6 py-3 sm:py-5" style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))', paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
          {children}
        </main>
      </body>
    </html>
  )
}
