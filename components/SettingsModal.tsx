'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { registerPush } from '@/lib/push'

const DAYS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
]

interface Schedule {
  time: string
  days: string
  timezone: string
  enabled: number
}

export default function SettingsModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [schedule, setSchedule] = useState<Schedule>({ time: '09:00', days: '1,2,3,4,5', timezone: 'UTC', enabled: 0 })
  const [saving, setSaving] = useState(false)
  const [swipeMode, setSwipeMode] = useState(true)
  const [reminderExpanded, setReminderExpanded] = useState(false)
  const [swipeExpanded, setSwipeExpanded] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    setSwipeMode(localStorage.getItem('swipe-mode-enabled') !== 'false')
    fetch('/api/push/schedule').then(r => r.json()).then(setSchedule).catch(() => {})
  }, [])

  const selectedDays = schedule.days.split(',').map(Number)

  function toggleDay(day: number) {
    const next = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day]
    setSchedule(s => ({ ...s, days: next.join(',') || '1' }))
  }

  async function saveReminder(enabled: boolean) {
    setSaving(true)
    if (enabled) await registerPush().catch(() => {})
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const updated = { ...schedule, timezone, enabled: enabled ? 1 : 0 }
    setSchedule(updated)
    await fetch('/api/push/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {})
    setSaving(false)
  }

  async function handleLogout() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function handleSwipeMode(checked: boolean) {
    setSwipeMode(checked)
    localStorage.setItem('swipe-mode-enabled', checked ? 'true' : 'false')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Settings"
        className="w-8 h-8 flex items-center justify-center rounded-lg transition-all focus:outline-none text-gray-400 hover:text-gray-600 hover:bg-gray-100"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />

          <div className="relative bg-white rounded-3xl px-5 pt-6 pb-6 w-full max-w-sm shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-gray-900">Settings</h2>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Section 1: Daily reminder */}
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setReminderExpanded(e => !e)}
                className="w-full flex items-center justify-between focus:outline-none"
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">Daily reminder</p>
                  <p className="text-xs text-gray-400 mt-0.5">Get notified to check your habits</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {schedule.enabled ? (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      On
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Off</span>
                  )}
                  <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-gray-400 transition-transform ${reminderExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </button>

              {reminderExpanded && (
                <div className="mt-4">
                  <div className="mb-4">
                    <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Time</p>
                    <input
                      type="time"
                      value={schedule.time}
                      onChange={e => setSchedule(s => ({ ...s, time: e.target.value }))}
                      className="w-full text-2xl font-light text-gray-900 border-0 border-b-2 border-gray-100 focus:border-gray-300 pb-2 focus:outline-none bg-transparent"
                    />
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">Days</p>
                    <div className="flex gap-1.5">
                      {DAYS.map(d => (
                        <button
                          key={d.value}
                          onClick={() => toggleDay(d.value)}
                          className={`flex-1 py-2.5 rounded-xl text-[11px] font-semibold transition-all focus:outline-none active:scale-95 ${
                            selectedDays.includes(d.value)
                              ? 'bg-gray-900 text-white'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => saveReminder(true)}
                      disabled={saving}
                      className="w-full py-3 rounded-2xl bg-gray-900 text-white text-sm font-semibold active:scale-[0.98] transition-all focus:outline-none disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : schedule.enabled ? 'Update reminder' : 'Turn on'}
                    </button>
                    {!!schedule.enabled && (
                      <button
                        onClick={() => saveReminder(false)}
                        disabled={saving}
                        className="w-full py-3 rounded-2xl bg-gray-100 text-gray-500 text-sm font-medium active:scale-[0.98] transition-all focus:outline-none"
                      >
                        Turn off
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 mb-6" />

            {/* Section 2: Swipe mode */}
            <div>
              <button
                type="button"
                onClick={() => setSwipeExpanded(e => !e)}
                className="w-full flex items-center justify-between focus:outline-none"
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">Swipe mode</p>
                  <p className="text-xs text-gray-400 mt-0.5">Automatically open daily check-in when you open the app</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${swipeMode ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 bg-gray-100'}`}>
                    {swipeMode ? 'On' : 'Off'}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-gray-400 transition-transform ${swipeExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </button>

              {swipeExpanded && (
                <div className="mt-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-700">Enable swipe mode</span>
                    <div
                      onClick={() => handleSwipeMode(!swipeMode)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${swipeMode ? 'bg-gray-900' : 'bg-gray-200'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${swipeMode ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </label>
                </div>
              )}
            </div>
            {/* Divider */}
            <div className="border-t border-gray-100 my-6" />

            {/* Section 3: Log out */}
            <div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={signingOut}
                className="w-full flex items-center justify-between focus:outline-none disabled:opacity-50"
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">Log out</p>
                  <p className="text-xs text-gray-400 mt-0.5">Sign out of your account</p>
                </div>
                <div className="shrink-0 ml-3">
                  {signingOut ? (
                    <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin block" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
