'use client'

import { useEffect, useRef, useState } from 'react'
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

export default function NotificationSettings() {
  const [open, setOpen] = useState(false)
  const [schedule, setSchedule] = useState<Schedule>({ time: '09:00', days: '1,2,3,4,5', timezone: 'UTC', enabled: 0 })
  const [saving, setSaving] = useState(false)

  const initialized = useRef(false)

  useEffect(() => {
    fetch('/api/push/schedule').then(r => r.json()).then(data => {
      setSchedule(data)
      initialized.current = true
    }).catch(() => { initialized.current = true })
  }, [])

  useEffect(() => {
    if (!initialized.current || !schedule.enabled) return
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const updated = { ...schedule, timezone }
    fetch('/api/push/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {})
  }, [schedule.time, schedule.days])

  const selectedDays = schedule.days.split(',').map(Number)

  function toggleDay(day: number) {
    const next = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day]
    setSchedule(s => ({ ...s, days: next.join(',') || '1' }))
  }

  async function save(enabled: boolean) {
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
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Reminder settings"
        className="w-8 h-8 flex items-center justify-center rounded-lg transition-all focus:outline-none text-gray-400 hover:text-gray-600 hover:bg-gray-100"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          {schedule.enabled ? <circle cx="18" cy="5" r="3" fill="#22c55e" stroke="none"/> : null}
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-3xl px-5 pt-6 pb-6 w-full max-w-sm shadow-2xl">

            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Daily reminder</h2>
                <p className="text-xs text-gray-400 mt-0.5">Get notified to check your habits</p>
              </div>
              {schedule.enabled ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full mt-0.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  On
                </span>
              ) : (
                <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full mt-0.5">Off</span>
              )}
            </div>

            {/* Time */}
            <div className="mb-5">
              <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Time</p>
              <input
                type="time"
                value={schedule.time}
                onChange={e => setSchedule(s => ({ ...s, time: e.target.value }))}
                className="w-full text-2xl font-light text-gray-900 border-0 border-b-2 border-gray-100 focus:border-gray-300 pb-2 focus:outline-none bg-transparent"
              />
            </div>

            {/* Days */}
            <div className="mb-7">
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

            {/* Actions */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => save(true)}
                disabled={saving}
                className="w-full py-3.5 rounded-2xl bg-gray-900 text-white text-sm font-semibold active:scale-[0.98] transition-all focus:outline-none disabled:opacity-50"
              >
                {saving ? 'Saving…' : schedule.enabled ? 'Update reminder' : 'Turn on'}
              </button>
              {!!schedule.enabled && (
                <button
                  onClick={() => save(false)}
                  disabled={saving}
                  className="w-full py-3.5 rounded-2xl bg-gray-100 text-gray-500 text-sm font-medium active:scale-[0.98] transition-all focus:outline-none"
                >
                  Turn off
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
