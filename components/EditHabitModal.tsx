'use client'

import { useEffect, useRef, useState } from 'react'
import { updateHabit, deleteHabit, fetchCompletions, toggleCompletion } from '@/lib/api'
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

const GOAL_MODES: { id: GoalMode; label: string }[] = [
  { id: 'year', label: 'This year' },
  { id: 'month', label: 'This month' },
  { id: 'calendar', label: 'Full year' },
  { id: 'fixed', label: 'Fixed' },
]

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Props {
  habit: Habit
  onClose: () => void
  onUpdated: (habit: Habit) => void
  onDayToggled: (habit: Habit) => void
  onDeleted: (id: number) => void
}

export default function EditHabitModal({ habit, onClose, onUpdated, onDayToggled, onDeleted }: Props) {
  const [name, setName] = useState(habit.name)
  const [color, setColor] = useState<string | null>(habit.color)
  const [goalMode, setGoalMode] = useState<GoalMode>('fixed')
  const [daysPerWeek, setDaysPerWeek] = useState('3')
  const [fixedGoal, setFixedGoal] = useState(String(habit.goal))
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set())

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  useEffect(() => {
    const from = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate()
    const to = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    fetchCompletions(from, to).then(cs => {
      setCompletedDates(new Set(cs.filter(c => c.habit_id === habit.id).map(c => c.date)))
    })
  }, [viewYear, viewMonth, habit.id])

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  function handleDayClick(date: string) {
    const alreadyDone = completedDates.has(date)
    // Optimistic update — instant UI response
    setCompletedDates(prev => {
      const next = new Set(prev)
      if (alreadyDone) next.delete(date)
      else next.add(date)
      return next
    })
    // Sync with server in background
    toggleCompletion(habit.id, date).then(({ habit: updated }) => {
      onDayToggled(updated)
    })
  }

  // Build calendar grid (Monday-start)
  const startPad = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (string | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1
      return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteHabit(habit.id)
      onDeleted(habit.id)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  const computedGoal =
    goalMode === 'year'
      ? Math.round(remainingWeeksInYear() * Number(daysPerWeek))
      : goalMode === 'month'
      ? Math.round(remainingWeeksInMonth() * Number(daysPerWeek))
      : goalMode === 'calendar'
      ? Math.round(weeksInCalendarYear() * Number(daysPerWeek))
      : Number(fixedGoal)

  const isGoalInvalid =
    goalMode === 'fixed'
      ? !fixedGoal || Number(fixedGoal) < 1
      : Number(daysPerWeek) < 1 || Number(daysPerWeek) > 7 || computedGoal < 1

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || isGoalInvalid) return
    setSubmitting(true)
    try {
      const updated = await updateHabit(habit.id, name, computedGoal, color)
      onUpdated(updated)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={e => { if (e.target === dialogRef.current) onClose() }}
      className="fixed inset-0 m-auto rounded-xl border border-gray-200 p-0 shadow-xl backdrop:bg-black/40 w-[calc(100%-2rem)] max-w-sm max-h-[90dvh] overflow-y-auto"
    >
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{habit.name}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all text-sm focus:outline-none"
          >
            ✕
          </button>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-lg"
          >
            ‹
          </button>
          <span className="text-sm font-medium text-gray-700">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-lg"
          >
            ›
          </button>
        </div>

        {/* Calendar */}
        <div>
          <div className="grid grid-cols-7">
            {DAY_HEADERS.map(d => (
              <div key={d} className="text-center text-[10px] text-gray-400 font-medium py-0.5">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((date, i) => {
              if (!date) return <div key={i} />
              const filled = completedDates.has(date)
              const isToday = date === todayStr
              const isFuture = date > todayStr
              return (
                <div key={date} className="flex justify-center py-0.5">
                  <button
                    type="button"
                    onClick={() => !isFuture && handleDayClick(date)}
                    disabled={isFuture}
                    className={`w-7 h-7 rounded-full text-xs font-semibold transition-all ${
                      filled
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : isToday
                        ? 'border-2 border-emerald-400 text-gray-800 hover:bg-emerald-50'
                        : isFuture
                        ? 'text-gray-300 cursor-default'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {String(parseInt(date.slice(8))).padStart(2, '0')}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Edit form */}
        <form onSubmit={handleSubmit} className="space-y-3 border-t border-gray-100 pt-3">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Name</label>
            <input
              type="text"
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
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {GOAL_MODES.map(m => (
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
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2.5 text-sm rounded-lg text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors focus:outline-none disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || isGoalInvalid || submitting}
                className="px-4 py-2 text-sm rounded-lg bg-gray-900 text-white disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </dialog>
  )
}
