'use client'

import { useEffect, useRef, useState } from 'react'
import { createHabit } from '@/lib/api'
import { HABIT_COLORS } from '@/lib/colors'
import type { Habit } from '@/lib/types'

type GoalMode = 'year' | 'month' | 'calendar' | 'fixed'

function remainingWeeksInYear(): number {
  const today = new Date()
  const endOfYear = new Date(today.getFullYear() + 1, 0, 1)
  return (endOfYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 7)
}

function remainingWeeksInMonth(): number {
  const today = new Date()
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  return (endOfMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 7)
}

function weeksInCalendarYear(): number {
  const year = new Date().getFullYear()
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  return (isLeap ? 366 : 365) / 7
}

interface Props {
  onClose: () => void
  onCreated: (habit: Habit) => void
}

export default function AddHabitModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [goalMode, setGoalMode] = useState<GoalMode>('year')
  const [daysPerWeek, setDaysPerWeek] = useState('3')
  const [fixedGoal, setFixedGoal] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const computedGoal =
    goalMode === 'year'
      ? Math.round(remainingWeeksInYear() * Number(daysPerWeek))
      : goalMode === 'month'
      ? Math.round(remainingWeeksInMonth() * Number(daysPerWeek))
      : goalMode === 'calendar'
      ? Math.round(weeksInCalendarYear() * Number(daysPerWeek))
      : Number(fixedGoal)

  const isDisabled =
    !name.trim() ||
    submitting ||
    (goalMode === 'fixed'
      ? !fixedGoal || Number(fixedGoal) < 1
      : Number(daysPerWeek) < 1 || Number(daysPerWeek) > 7 || computedGoal < 1)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || isDisabled) return
    setSubmitting(true)
    try {
      const habit = await createHabit(name, computedGoal, color)
      onCreated(habit)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const MODES: { id: GoalMode; label: string }[] = [
    { id: 'year', label: 'This year' },
    { id: 'month', label: 'This month' },
    { id: 'calendar', label: 'Full year' },
    { id: 'fixed', label: 'Fixed' },
  ]

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={e => { if (e.target === dialogRef.current) onClose() }}
      className="fixed inset-0 m-auto rounded-xl border border-gray-200 p-0 shadow-xl backdrop:bg-black/40 w-[calc(100%-2rem)] max-w-sm max-h-[90dvh] overflow-y-auto"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <h2 className="text-base font-semibold">New habit</h2>

        <div className="space-y-1">
          <label className="text-xs text-gray-500">Name</label>
          <input
            autoFocus
            type="text"
            placeholder="e.g. Read 30 min"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-500">Habit color</label>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setColor(null)}
              className="w-8 h-8 rounded-full transition-all bg-white border border-gray-200 hover:scale-105 flex items-center justify-center"
            >
              {color === null && <span className="w-3 h-3 rounded-full bg-gray-300 block" />}
            </button>
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
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-500">Goal</label>
          {/* Mode tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {MODES.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setGoalMode(m.id)}
                className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${
                  goalMode === m.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {goalMode === 'fixed' ? (
            <input
              type="number"
              min={1}
              max={3650}
              placeholder="e.g. 30"
              value={fixedGoal}
              onChange={e => setFixedGoal(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
            />
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={daysPerWeek}
                  onChange={e => setDaysPerWeek(e.target.value)}
                  className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
                />
                <span className="text-sm text-gray-500">days / week</span>
              </div>
              <p className="text-xs text-gray-400">
                <span className="font-medium text-gray-600">{computedGoal} days</span> need to complete the goal
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isDisabled}
            className="px-4 py-2 text-sm rounded-lg bg-gray-900 text-white disabled:opacity-50"
          >
            {submitting ? 'Adding...' : 'Add'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
