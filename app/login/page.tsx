'use client'

import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  async function handleGoogleLogin() {
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
    <div className="flex flex-col items-center justify-center pt-20 gap-5">
      <button
        onClick={handleGoogleLogin}
        className="w-20 h-20 rounded-full bg-gray-900 text-white flex items-center justify-center active:scale-95 transition-all shadow-xl hover:bg-gray-800 focus:outline-none"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      <div className="text-center">
        <p className="text-base font-medium text-gray-800">Start tracking habits</p>
        <p className="text-sm text-gray-400 mt-1">Tap to add your first goal</p>
      </div>
    </div>
  )
}
