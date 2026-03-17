import type { Habit, Completion } from '@/lib/types'
import HabitYearGrid from '@/components/HabitYearGrid'

const DAY_ABBREVS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getWeekDates(): string[] {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().slice(0, 10)
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
            style={{ backgroundColor: (habit.color ?? '#F3F4F6') + '33' }}
            className={`rounded-2xl border px-3 py-4 cursor-pointer transition-all ${
              'border-transparent hover:opacity-90'
            }`}
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
                      {DAY_ABBREVS[i]}
                    </span>
                    <button
                      onClick={() => onToggleDay(habit.id, date)}
                      style={{
                        backgroundColor: filled
                          ? (habit.color ?? '#9CA3AF')
                          : ((habit.color ?? '#9CA3AF') + '55'),
                      }}
                      className={`w-9 h-9 min-[375px]:w-10 min-[375px]:h-10 sm:w-12 sm:h-12 rounded-full text-[10px] min-[375px]:text-xs sm:text-sm font-bold transition-opacity ${
                        filled
                          ? 'text-white shadow-md'
                          : 'text-white hover:opacity-80'
                      }`}
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
                {count} / {habit.goal} days ({pct}%){pct >= 100 ? <span style={{ color: 'initial', filter: 'none' }}> 🎉</span> : ''}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
