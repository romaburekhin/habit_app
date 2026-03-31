'use client'

import { useEffect, useRef, useState } from 'react'
import { updateHabit, deleteHabit, fetchCompletions, toggleCompletion } from '@/lib/api'
import { HABIT_COLORS, GRAY_COLOR, COLOR_VARIANTS } from '@/lib/colors'
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

// Default neutral gray when no color is selected — modal is always light-themed
const DEFAULT_COLOR = '#E5E7EB'

interface Props {
  habit: Habit
  onClose: () => void
  onUpdated: (habit: Habit) => void
  onDayToggled: (habit: Habit, date: string, added: boolean) => void
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

  // Modal is always light-themed; fall back to green when no color selected
  const activeColor = color ?? DEFAULT_COLOR

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
    setCompletedDates(prev => {
      const next = new Set(prev)
      if (alreadyDone) next.delete(date)
      else next.add(date)
      return next
    })
    toggleCompletion(habit.id, date).then(({ habit: updated }) => {
      onDayToggled(updated, date, !alreadyDone)
    })
  }

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

  // Always light modal — background tinted with card color variant (or activeColor fallback)
  const cardColor = COLOR_VARIANTS[color ?? '']?.card ?? activeColor
  const dialogStyle = { background: `linear-gradient(${cardColor}4D, ${cardColor}4D), white` }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={e => { if (e.target === dialogRef.current) onClose() }}
      style={dialogStyle}
      className="fixed inset-0 m-auto rounded-2xl border-0 p-0 shadow-2xl backdrop:bg-black/40 w-[calc(100%-2rem)] max-w-sm max-h-[90dvh] overflow-y-auto"
    >
      <div className="p-4 space-y-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <button type="button" onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-black/8 transition-colors text-lg">‹</button>
          <span className="text-sm font-medium text-gray-800">{MONTH_NAMES[viewMonth]} {viewYear}</span>
          <button type="button" onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-black/8 transition-colors text-lg">›</button>
        </div>

        {/* Calendar */}
        <div>
          <div className="grid grid-cols-7">
            {DAY_HEADERS.map(d => (
              <div key={d} className="text-center text-[10px] text-gray-400 font-medium py-0.5">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((date, i) => {
              if (!date) return <div key={i} />
              const filled = completedDates.has(date)
              const isToday = date === todayStr
              const isFuture = date > todayStr
              const variants = COLOR_VARIANTS[color ?? '']
              const filledColor = variants?.filled ?? color ?? '#9CA3AF'
              const unfilledColor = variants?.unfilled
              return (
                <div key={date} className="flex justify-center py-0.5">
                  <button
                    type="button"
                    onClick={() => !isFuture && handleDayClick(date)}
                    disabled={isFuture}
                    style={
                      filled
                        ? { backgroundColor: filledColor }
                        : isToday
                        ? { borderColor: filledColor, borderWidth: 2, borderStyle: 'solid' }
                        : !isFuture && unfilledColor
                        ? { backgroundColor: unfilledColor }
                        : undefined
                    }
                    className={`w-[31px] h-[31px] rounded-full text-xs font-semibold transition-all ${
                      filled
                        ? 'text-white shadow-sm'
                        : isToday
                        ? 'border-2 text-gray-700 hover:bg-black/8'
                        : isFuture
                        ? 'text-gray-300 cursor-default'
                        : 'text-gray-600 hover:bg-black/8'
                    }`}
                  >
                    {String(parseInt(date.slice(8))).padStart(2, '0')}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Since date */}
        <p className="text-[10px] text-gray-400 text-center">
          Since {new Date(habit.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>

        {/* Edit form */}
        <form onSubmit={handleSubmit} className="space-y-3 border-t border-black/10 pt-3">
          <div className="space-y-1">
            <label className="text-xs text-gray-400">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none border border-black/10 bg-white/70 text-gray-900 placeholder-gray-400 focus:border-black/20"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400">Habit color</label>
            <div className="flex gap-2 flex-wrap">
              {HABIT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: COLOR_VARIANTS[c]?.filled ?? c }}
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
            <label className="text-xs text-gray-400">Goal</label>
            <div className="flex gap-1 bg-black/8 rounded-lg p-1">
              {GOAL_MODES.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setGoalMode(m.id)}
                  className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${
                    goalMode === m.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {goalMode === 'fixed' ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={fixedGoal}
                    onChange={e => setFixedGoal(e.target.value)}
                    className="w-20 rounded-lg px-3 py-2 text-sm outline-none border border-black/10 bg-white/70 text-gray-900 placeholder-gray-400 focus:border-black/20"
                  />
                  <span className="text-sm text-gray-500">days</span>
                </div>
                <p className="text-xs text-gray-400">
                  <span className="font-medium text-gray-700">{fixedGoal || '0'} days</span> need to complete the goal
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={daysPerWeek}
                    onChange={e => setDaysPerWeek(e.target.value)}
                    className="w-20 rounded-lg px-3 py-2 text-sm outline-none border border-black/10 bg-white/70 text-gray-900 placeholder-gray-400 focus:border-black/20"
                  />
                  <span className="text-sm text-gray-500">days per week</span>
                </div>
                <p className="text-xs text-gray-400">
                  <span className="font-medium text-gray-700">{computedGoal} days</span> need to complete the goal
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2.5 text-sm rounded-lg transition-colors focus:outline-none disabled:opacity-50 text-gray-500 hover:bg-black/8"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm rounded-lg focus:outline-none text-gray-500 hover:bg-black/8">
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || isGoalInvalid || submitting}
                style={{ backgroundColor: COLOR_VARIANTS[color ?? '']?.filled ?? activeColor }}
                className="px-4 py-2 text-sm rounded-lg disabled:opacity-40 text-white font-medium"
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
