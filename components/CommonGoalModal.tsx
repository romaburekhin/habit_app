'use client'

import { useEffect, useRef, useState } from 'react'
import { searchUsers, createChallenge } from '@/lib/api'
import type { Habit, Profile } from '@/lib/types'

interface Props {
  habits: Habit[]
  sharedHabitIds?: Map<number, string>
  onClose: () => void
  onSent: () => void
}

type Step = 'habit' | 'user' | 'confirm'

export default function CommonGoalModal({ habits, sharedHabitIds, onClose, onSent }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [step, setStep] = useState<Step>('habit')
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null)
  const [emailQuery, setEmailQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { dialogRef.current?.showModal() }, [])

  useEffect(() => {
    if (emailQuery.length < 2) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await searchUsers(emailQuery)
        setSearchResults(results)
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [emailQuery])

  async function handleSend() {
    if (!selectedHabit || !selectedUser) return
    setSubmitting(true)
    setError('')
    try {
      await createChallenge(selectedHabit.id, selectedUser.email)
      onSent()
      onClose()
    } catch {
      setError('Failed to send invite. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={e => { if (e.target === dialogRef.current) onClose() }}
      className="fixed inset-0 m-auto rounded-2xl border-0 p-0 shadow-2xl backdrop:bg-black/40 w-[calc(100%-2rem)] max-w-sm max-h-[90dvh] overflow-y-auto bg-white"
    >
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step !== 'habit' && (
              <button
                type="button"
                onClick={() => setStep(step === 'confirm' ? 'user' : 'habit')}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-black/8 transition-colors"
              >
                ‹
              </button>
            )}
            <span className="text-sm font-medium text-gray-800">
              {step === 'habit' ? 'Select habit to share with' : step === 'user' ? 'Find opponent' : 'Confirm challenge'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-black/8 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Step 1: Select habit */}
        {step === 'habit' && (
          <ul className="space-y-2">
            {habits.map(habit => (
              <li key={habit.id}>
                <button
                  type="button"
                  onClick={() => { setSelectedHabit(habit); setStep('user') }}
                  style={{ backgroundColor: (habit.color ?? '#F3F4F6') + '40' }}
                  className="w-full text-left rounded-xl px-3 py-3 transition-all hover:opacity-80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      style={habit.color ? { color: habit.color, filter: 'brightness(0.7)' } : undefined}
                      className={`text-sm font-medium truncate ${!habit.color ? 'text-gray-700' : ''}`}
                    >
                      {habit.name}
                    </span>
                    {sharedHabitIds?.has(habit.id) && (
                      <span className="text-[10px] text-gray-400 bg-black/8 rounded-full px-1.5 py-0.5 shrink-0">
                        shared with {(sharedHabitIds.get(habit.id) ?? '').split(' ')[0]}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{habit.completed_days}/{habit.goal} days</span>
                </button>
              </li>
            ))}
          </ul>
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
                className="w-full rounded-lg px-3 py-2 text-sm outline-none border border-black/10 bg-white text-gray-900 placeholder-gray-400 focus:border-black/20"
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
        {step === 'confirm' && selectedHabit && selectedUser && (
          <div className="space-y-4">
            <div className="rounded-xl bg-gray-50 p-3 space-y-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">Your habit</p>
                <div
                  style={{ backgroundColor: (selectedHabit.color ?? '#F3F4F6') + '40' }}
                  className="rounded-lg px-3 py-2"
                >
                  <span
                    style={selectedHabit.color ? { color: selectedHabit.color, filter: 'brightness(0.7)' } : undefined}
                    className={`text-sm font-medium ${!selectedHabit.color ? 'text-gray-700' : ''}`}
                  >
                    {selectedHabit.name}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Challenge sent to</p>
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
                style={{ backgroundColor: selectedHabit.color ?? '#E5E7EB' }}
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
