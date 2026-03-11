import type { Habit, Completion } from '@/lib/types'

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
  loading: boolean
  error: string | null
  onEdit: (habit: Habit) => void
  onDelete: (id: number) => void
  onToggleDay: (habit_id: number, date: string) => void
}

export default function HabitList({ habits, completions, loading, error, onEdit, onDelete, onToggleDay }: Props) {
  if (loading) return <p className="text-sm text-gray-400">Loading...</p>
  if (error) return <p className="text-sm text-gray-400">{error}</p>
  if (!habits.length) return <p className="text-sm text-gray-400">No habits yet.</p>

  const weekDates = getWeekDates()

  return (
    <ul className="space-y-1.5">
      {habits.map(habit => {
        const count = habit.completed_days
        const done = count >= habit.goal
        const pct = Math.round((count / habit.goal) * 100)

        return (
          <li
            key={habit.id}
            onClick={() => onEdit(habit)}
            style={habit.color ? { backgroundColor: habit.color + '33' } : undefined}
            className={`rounded-lg border px-3 py-2 cursor-pointer transition-all ${
              habit.color
                ? 'border-transparent hover:opacity-90'
                : done
                ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
                : 'bg-white border-gray-100 hover:border-gray-200'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <span
                style={habit.color ? { color: habit.color, filter: 'brightness(0.85)' } : undefined}
                className={`text-sm font-normal tracking-tight truncate ${!habit.color && (done ? 'text-emerald-800' : 'text-gray-900')}`}
              >
                {habit.name}
              </span>
              <div className="flex items-center gap-2 ml-2 shrink-0">
                {habit.streak > 0 && (
                  <span
                    style={pct >= 100 && habit.color ? { color: habit.color, filter: 'brightness(0.85)' } : undefined}
                    className={`text-[11px] ${pct >= 100 ? (habit.color ? '' : 'text-emerald-600 font-medium') : 'text-gray-400'}`}
                  >
                    {habit.streak} days in a row
                  </span>
                )}
                <button
                  onClick={e => { e.stopPropagation(); onDelete(habit.id) }}
                  aria-label={`Delete ${habit.name}`}
                  className="text-gray-300 hover:text-gray-500 transition-colors text-xs"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Week day circles */}
            <div
              className="flex gap-2 justify-center mb-3"
              onClick={e => e.stopPropagation()}
            >
              {weekDates.map((date, i) => {
                const filled = completions.some(c => c.habit_id === habit.id && c.date === date)
                return (
                  <div key={date} className="flex flex-col items-center gap-0.5">
                    <span className="text-[11px] font-medium text-gray-400">
                      {DAY_ABBREVS[i]}
                    </span>
                    <button
                      onClick={() => onToggleDay(habit.id, date)}
                      style={habit.color ? {
                        backgroundColor: filled ? habit.color : habit.color + '59',
                      } : undefined}
                      className={`w-10 h-10 rounded-full text-xs font-bold transition-all ${
                        habit.color
                          ? filled
                            ? 'text-white shadow-lg scale-110'
                            : 'text-white hover:opacity-80'
                          : filled
                          ? 'bg-emerald-500 text-white shadow-sm scale-105'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
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
                className={`text-[11px] ${pct >= 100 ? (habit.color ? '' : 'text-emerald-600 font-medium') : 'text-gray-400'}`}
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
