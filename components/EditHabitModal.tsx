'use client'

import { useEffect, useRef, useState } from 'react'
import { updateHabit, fetchCompletions, toggleCompletion } from '@/lib/api'
import { HABIT_COLORS } from '@/lib/colors'
import type { Habit } from '@/lib/types'

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
}

export default function EditHabitModal({ habit, onClose, onUpdated, onDayToggled }: Props) {
  const [name, setName] = useState(habit.name)
  const [goal, setGoal] = useState(habit.goal)
  const [color, setColor] = useState<string | null>(habit.color)
  const [submitting, setSubmitting] = useState(false)
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

  async function handleDayClick(date: string) {
    const { created, habit: updated } = await toggleCompletion(habit.id, date)
    setCompletedDates(prev => {
      const next = new Set(prev)
      if (created) next.add(date)
      else next.delete(date)
      return next
    })
    onDayToggled(updated)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      const updated = await updateHabit(habit.id, name, goal, color)
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
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 p-0 shadow-xl backdrop:bg-black/40 w-full max-w-sm max-h-[90vh] overflow-y-auto"
    >
      <div className="p-5 space-y-4">
        <h2 className="text-base font-semibold">{habit.name}</h2>

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
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Goal (days)</label>
            <input
              type="number"
              min={1}
              max={365}
              value={goal}
              onChange={e => setGoal(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || goal < 1 || submitting}
              className="px-4 py-2 text-sm rounded-lg bg-gray-900 text-white disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
