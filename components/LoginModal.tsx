'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  onClose: () => void
  onLoggedIn: () => void
}

export default function LoginModal({ onClose, onLoggedIn }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  async function handleGoogleLogin() {
    setSigningIn(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    })
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={e => { if (e.target === dialogRef.current) onClose() }}
      className="fixed inset-0 m-auto rounded-2xl p-0 shadow-2xl backdrop:bg-black/50 w-[calc(100%-2rem)] max-w-xs bg-white border-0"
    >
      <div className="p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Sign in</h2>
            <p className="text-sm text-gray-400 mt-0.5">to start tracking habits</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-all focus:outline-none -mt-0.5 -mr-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Google button */}
        <button
          onClick={handleGoogleLogin}
          disabled={signingIn}
          className="flex items-center justify-center gap-3 w-full py-3 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 active:scale-[0.98] transition-all shadow-sm focus:outline-none disabled:opacity-60 disabled:pointer-events-none"
        >
          {signingIn ? (
            <>
              <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>
      </div>
    </dialog>
  )
}
