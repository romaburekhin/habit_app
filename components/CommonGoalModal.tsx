'use client'

import { useEffect, useRef, useState } from 'react'
import { searchUsers, createChallenge } from '@/lib/api'
import { HABIT_COLORS, GRAY_COLOR } from '@/lib/colors'
import type { Profile } from '@/lib/types'

interface Props {
  onClose: () => void
  onSent: () => void
}

type Step = 'setup' | 'user' | 'confirm'
type PeriodOption = '1m' | '3m' | 'year' | 'custom'

const PERIODS: { id: PeriodOption; label: string }[] = [
  { id: '1m', label: '1 month' },
  { id: '3m', label: '3 months' },
  { id: 'year', label: 'This year' },
  { id: 'custom', label: 'Custom' },
]

function getPeriodEnd(period: PeriodOption, customEnd: string): string {
  const today = new Date()
  if (period === '1m') {
    const d = new Date(today); d.setMonth(d.getMonth() + 1)
    return d.toISOString().slice(0, 10)
  }
  if (period === '3m') {
    const d = new Date(today); d.setMonth(d.getMonth() + 3)
    return d.toISOString().slice(0, 10)
  }
  if (period === 'year') {
    return `${today.getFullYear()}-12-31`
  }
  return customEnd
}

function getDaysForPeriod(period: PeriodOption, customEnd: string, customStart?: string): number {
  const end = getPeriodEnd(period, customEnd)
  const start = period === 'custom' && customStart ? new Date(customStart) : new Date()
  const endDate = new Date(end)
  return Math.max(1, Math.ceil((endDate.getTime() - start.getTime()) / 86400000))
}

export default function CommonGoalModal({ onClose, onSent }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [step, setStep] = useState<Step>('setup')

  // Step 1: challenge setup
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState<string>(HABIT_COLORS[0])
  const [period, setPeriod] = useState<PeriodOption>('1m')
  const [customEnd, setCustomEnd] = useState('')
  const [customStart, setCustomStart] = useState(new Date().toISOString().slice(0, 10))

  // Step 2: find user
  const [emailQuery, setEmailQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)

  // Step 3: submit
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { dialogRef.current?.showModal() }, [])

  useEffect(() => {
    if (emailQuery.length < 2) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try { setSearchResults(await searchUsers(emailQuery)) }
      finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [emailQuery])

  async function handleSend() {
    if (!selectedUser || !name.trim()) return
    setSubmitting(true)
    setError('')
    const periodEnd = getPeriodEnd(period, customEnd)
    const days = getDaysForPeriod(period, customEnd, customStart)
    try {
      await createChallenge({ name: name.trim(), description: description.trim(), color, periodEnd, startDate: period === 'custom' ? customStart : undefined, days, inviteeEmail: selectedUser.email })
      onSent()
      onClose()
    } catch {
      setError('Failed to send invite. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const activeColor = color
  const dialogStyle = { background: `linear-gradient(${activeColor}33, ${activeColor}33), white` }

  const setupValid = name.trim().length > 0 && (period !== 'custom' || customEnd) && (period !== 'custom' || !customStart || customStart < customEnd)

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={e => { if (e.target === dialogRef.current) onClose() }}
      style={dialogStyle}
      className="fixed inset-0 m-auto rounded-2xl border-0 p-0 shadow-2xl backdrop:bg-black/40 w-[calc(100%-2rem)] max-w-sm max-h-[90dvh] overflow-y-auto bg-white"
    >
      <div className="p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step !== 'setup' && (
              <button
                type="button"
                onClick={() => setStep(step === 'confirm' ? 'user' : 'setup')}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-black/8 transition-colors text-lg"
              >
                ‹
              </button>
            )}
            <h2 className="text-base font-semibold text-gray-900">
              {step === 'setup' ? 'New challenge' : step === 'user' ? 'Find opponent' : 'Confirm challenge'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-black/8 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Step 1: Challenge setup */}
        {step === 'setup' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Challenge name</label>
              <input
                autoFocus
                type="text"
                placeholder="e.g. Read every day"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none border border-black/10 bg-white/70 text-gray-900 placeholder-gray-400 focus:border-black/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400">Prize / description <span className="text-gray-300">(optional)</span></label>
              <input
                type="text"
                placeholder="e.g. Winner buys dinner"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none border border-black/10 bg-white/70 text-gray-900 placeholder-gray-400 focus:border-black/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-400">Color</label>
              <div className="flex gap-2 flex-wrap">
                {HABIT_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className="w-8 h-8 rounded-full transition-all hover:scale-105 flex items-center justify-center"
                  >
                    {color === c && <span className="w-3 h-3 rounded-full bg-white block" />}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setColor(GRAY_COLOR)}
                  style={{ backgroundColor: GRAY_COLOR }}
                  className="w-8 h-8 rounded-full transition-all hover:scale-105 flex items-center justify-center"
                >
                  {color === GRAY_COLOR && <span className="w-3 h-3 rounded-full bg-white block" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400">Challenge period</label>
              <div className="flex gap-1 bg-black/8 rounded-lg p-1">
                {PERIODS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPeriod(p.id)}
                    className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${
                      period === p.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {period === 'custom' ? (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400">Start date</label>
                    <input
                      type="date"
                      value={customStart}
                      max={customEnd || undefined}
                      onChange={e => setCustomStart(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none border border-black/10 bg-white/70 text-gray-900 focus:border-black/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400">End date</label>
                    <input
                      type="date"
                      value={customEnd}
                      min={customStart || new Date().toISOString().slice(0, 10)}
                      onChange={e => setCustomEnd(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none border border-black/10 bg-white/70 text-gray-900 focus:border-black/20"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  <span className="font-medium text-gray-700">{getDaysForPeriod(period, customEnd)} days</span> · ends {getPeriodEnd(period, customEnd)}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setStep('user')}
                disabled={!setupValid}
                style={{ backgroundColor: activeColor }}
                className="px-4 py-2 text-sm rounded-lg disabled:opacity-40 text-gray-800 font-medium"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Find user */}
        {step === 'user' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-400">by email or user name</label>
              <input
                type="text"
                value={emailQuery}
                onChange={e => { setEmailQuery(e.target.value); setSelectedUser(null) }}
                placeholder="friend@example.com"
                autoFocus
                className="w-full rounded-lg px-3 py-2 text-sm outline-none border border-black/10 bg-white/70 text-gray-900 placeholder-gray-400 focus:border-black/20"
              />
            </div>

            {searching && <p className="text-xs text-gray-400">Searching...</p>}
            {!searching && emailQuery.length >= 2 && searchResults.length === 0 && (
              <p className="text-xs text-gray-400">No users found. They need to have signed in at least once.</p>
            )}
            {searchResults.length > 0 && (
              <ul className="space-y-1">
                {searchResults.map(u => (
                  <li key={u.user_id}>
                    <button
                      type="button"
                      onClick={() => { setSelectedUser(u); setStep('confirm') }}
                      className="w-full text-left rounded-xl px-3 py-2.5 transition-all hover:bg-black/5 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 shrink-0">
                        {(u.name ?? u.email)[0].toUpperCase()}
                      </div>
                      <div>
                        {u.name && <p className="text-sm font-medium text-gray-800">{u.name}</p>}
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && selectedUser && (
          <div className="space-y-4">
            <div className="rounded-xl bg-black/5 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-sm font-medium text-gray-800">{name}</span>
              </div>
              {description && <p className="text-xs text-gray-500 pl-5">🏆 {description}</p>}
              <p className="text-xs text-gray-400 pl-5">
                {getDaysForPeriod(period, customEnd)} days · ends {getPeriodEnd(period, customEnd)}
              </p>
              <div className="border-t border-black/8 pt-3">
                <p className="text-xs text-gray-400 mb-1.5">Challenge sent to</p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 shrink-0">
                    {(selectedUser.name ?? selectedUser.email)[0].toUpperCase()}
                  </div>
                  <div>
                    {selectedUser.name && <p className="text-sm font-medium text-gray-800">{selectedUser.name}</p>}
                    <p className="text-xs text-gray-500">{selectedUser.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm rounded-lg text-gray-500 hover:bg-black/8 transition-colors focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={submitting}
                style={{ backgroundColor: color }}
                className="px-4 py-2 text-sm rounded-lg disabled:opacity-40 text-gray-800 font-medium transition-colors"
              >
                {submitting ? 'Sending...' : 'Send invite'}
              </button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  )
}
