import type { Habit, Completion } from '@/lib/types'
import HabitYearGrid from '@/components/HabitYearGrid'

const DAY_ABBREVS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekDates(): string[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - 6 + i)
    return toLocalDate(d)
  })
}

interface Props {
  habits: Habit[]
  completions: Completion[]
  yearCompletions: Completion[]
  loading: boolean
  error: string | null
  viewMode: 'cards' | 'heatmap'
  onEdit: (habit: Habit) => void
  onToggleDay: (habit_id: number, date: string) => void
}

export default function HabitList({ habits, completions, yearCompletions, loading, error, viewMode, onEdit, onToggleDay }: Props) {
  if (loading) return <p className="text-sm text-gray-500">Loading...</p>
  if (error) return <p className="text-sm text-gray-500">{error}</p>
  if (!habits.length) return null

  if (viewMode === 'heatmap') {
    return (
      <ul className="space-y-3">
        {habits.map(habit => {
          const completedDates = new Set(
            yearCompletions.filter(c => c.habit_id === habit.id).map(c => c.date)
          )
          return (
            <HabitYearGrid
              key={habit.id}
              habit={habit}
              completedDates={completedDates}
              onEdit={onEdit}
            />
          )
        })}
      </ul>
    )
  }

  const weekDates = getWeekDates()

  return (
    <ul className="space-y-3">
      {habits.map(habit => {
        const count = habit.completed_days
        const done = count >= habit.goal
        const pct = Math.round((count / habit.goal) * 100)

        return (
          <li
            key={habit.id}
            onClick={() => onEdit(habit)}
            style={{ backgroundColor: (habit.color ?? '#F3F4F6') + '40' }}
            className="rounded-2xl border border-transparent px-3 py-4 cursor-pointer transition-all hover:opacity-90"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <span
                style={habit.color ? { color: habit.color, filter: 'brightness(0.7)' } : undefined}
                className={`text-sm font-normal tracking-tight truncate ${!habit.color && 'text-gray-700'}`}
              >
                {habit.name}
              </span>
              {habit.streak > 0 && (
                <span
                  style={pct >= 100 && habit.color ? { color: habit.color, filter: 'brightness(0.85)' } : undefined}
                  className={`text-[11px] ml-2 shrink-0 ${pct >= 100 ? (habit.color ? '' : 'text-emerald-500 font-medium') : 'text-gray-400'}`}
                >
                  {habit.streak} days in a row
                </span>
              )}
            </div>

            {/* Week day circles */}
            <div
              className="flex justify-between mb-2"
              onClick={e => e.stopPropagation()}
            >
              {weekDates.map((date, i) => {
                const filled = completions.some(c => c.habit_id === habit.id && c.date === date)
                return (
                  <div key={date} className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] sm:text-[11px] font-medium text-gray-400">
                      {DAY_ABBREVS[new Date(date + 'T00:00:00').getDay()]}
                    </span>
                    <button
                      onClick={() => onToggleDay(habit.id, date)}
                      style={{ backgroundColor: filled ? (habit.color ?? '#9CA3AF') : (habit.color ?? '#9CA3AF') + '61' }}
                      className={`w-9 h-9 min-[375px]:w-10 min-[375px]:h-10 sm:w-12 sm:h-12 rounded-full text-[10px] min-[375px]:text-xs sm:text-sm font-bold text-white transition-opacity hover:opacity-80 ${filled ? 'shadow-sm' : ''}`}
                    >
                      {date.slice(8)}
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="text-center">
              <span
                style={pct >= 100 && habit.color ? { color: habit.color, filter: 'brightness(0.85)' } : undefined}
                className={`text-[11px] ${pct >= 100 ? (habit.color ? '' : 'text-emerald-500 font-medium') : 'text-gray-400'}`}
              >
                {count} / {habit.goal} days ({pct}%){pct >= 100 ? ' 🎉' : ''}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
