'use client'

import { useEffect, useRef, useState } from 'react'
import { proposeUpdate } from '@/lib/api'
import type { ChallengeView } from '@/lib/types'

interface Props {
  challenge: ChallengeView
  onClose: () => void
  onSent: () => void
}

type PeriodOption = '1m' | '3m' | 'year' | 'custom'

const PERIODS: { id: PeriodOption; label: string }[] = [
  { id: '1m', label: '1 month' },
  { id: '3m', label: '3 months' },
  { id: 'year', label: 'This year' },
  { id: 'custom', label: 'Custom' },
]

function addMonths(date: Date, months: number): string {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function getPeriodEnd(period: PeriodOption, customEnd: string): string {
  const today = new Date()
  if (period === '1m') return addMonths(today, 1)
  if (period === '3m') return addMonths(today, 3)
  if (period === 'year') return `${today.getFullYear()}-12-31`
  return customEnd
}

function getDays(periodEnd: string, startDate: string): number {
  const end = new Date(periodEnd)
  const start = new Date(startDate)
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000))
}

export default function EditChallengeModal({ challenge, onClose, onSent }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  const habitName = challenge.my_habit?.name ?? ''
  const existingStart = (challenge.start_date ?? challenge.created_at).slice(0, 10)
  const existingEnd = challenge.period_end ?? addMonths(new Date(), 1)

  const [name, setName] = useState(habitName)
  const [description, setDescription] = useState(challenge.description ?? '')
  const [period, setPeriod] = useState<PeriodOption>('custom')
  const [customStart, setCustomStart] = useState(existingStart)
  const [customEnd, setCustomEnd] = useState(existingEnd)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { dialogRef.current?.showModal() }, [])

  const periodEnd = getPeriodEnd(period, customEnd)
  const startDate = period === 'custom' ? customStart : new Date().toISOString().slice(0, 10)
  const days = getDays(periodEnd, startDate)
  const valid = name.trim().length > 0 && (period !== 'custom' || (!!customEnd && customStart < customEnd))

  async function handleSubmit() {
    if (!valid) return
    setSubmitting(true)
    setError('')
    try {
      await proposeUpdate(challenge.id, { name: name.trim(), description: description.trim(), periodEnd, startDate, days })
      onSent()
      onClose()
    } catch {
      setError('Failed to send update. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={e => { e.stopPropagation(); if (e.target === dialogRef.current) onClose() }}
      className="fixed inset-0 m-auto rounded-2xl border-0 p-0 shadow-2xl backdrop:bg-black/40 w-[calc(100%-2rem)] max-w-sm max-h-[90dvh] overflow-y-auto bg-white"
    >
      <div className="p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Edit challenge</h2>
          <button type="button" onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-black/8 text-xl leading-none">×</button>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-400">Challenge name</label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none border border-black/10 bg-white text-gray-900 focus:border-black/20"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-400">Prize / description <span className="text-gray-300">(optional)</span></label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Winner buys dinner"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none border border-black/10 bg-white text-gray-900 placeholder-gray-400 focus:border-black/20"
          />
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
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none border border-black/10 bg-white text-gray-900 focus:border-black/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">End date</label>
                <input
                  type="date"
                  value={customEnd}
                  min={customStart || new Date().toISOString().slice(0, 10)}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none border border-black/10 bg-white text-gray-900 focus:border-black/20"
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              <span className="font-medium text-gray-700">{days} days</span> · ends {periodEnd}
            </p>
          )}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <p className="text-[11px] text-gray-400">Your opponent will need to accept the changes.</p>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-500 rounded-lg hover:bg-black/8">Cancel</button>
          <button
            type="button"
            disabled={!valid || submitting}
            onClick={handleSubmit}
            className="px-4 py-2 text-sm rounded-lg bg-gray-900 text-white font-medium disabled:opacity-40"
          >
            {submitting ? 'Sending…' : 'Send update'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
