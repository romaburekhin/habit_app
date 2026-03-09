import type { Habit } from '@/lib/types'

interface Props {
  habits: Habit[]
  loading: boolean
  error: string | null
  onEdit: (habit: Habit) => void
  onDelete: (id: number) => void
  onToggleToday: (id: number) => void
}

export default function HabitList({ habits, loading, error, onEdit, onDelete, onToggleToday }: Props) {
  if (loading) return <p className="text-sm text-gray-400">Loading...</p>
  if (error) return <p className="text-sm text-gray-400">{error}</p>
  if (!habits.length) return <p className="text-sm text-gray-400">No habits yet.</p>

  return (
    <ul className="space-y-3">
      {habits.map(habit => {
        const count = habit.completed_days
        const done = count >= habit.goal
        const pct = Math.min(100, Math.round((count / habit.goal) * 100))

        return (
          <li
            key={habit.id}
            onClick={() => onEdit(habit)}
            className={`flex items-center gap-4 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
              done
                ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Log button */}
            <button
              onClick={e => { e.stopPropagation(); onToggleToday(habit.id) }}
              aria-label="Log one day"
              className={`shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center text-lg leading-none transition-all ${
                done
                  ? 'border-emerald-400 text-emerald-500 hover:border-emerald-600 hover:text-emerald-700'
                  : 'border-gray-200 text-gray-300 hover:border-gray-900 hover:text-gray-900'
              }`}
            >
              {done ? '✓' : '+'}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-sm font-medium truncate ${done ? 'text-emerald-800' : ''}`}>
                  {habit.name}
                </span>
                <div className="flex items-center gap-3 ml-3 shrink-0">
                  <span className={`text-xs ${done ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
                    {count} / {habit.goal} days ({pct}%)
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(habit.id) }}
                    aria-label={`Delete ${habit.name}`}
                    className="text-gray-300 hover:text-gray-500 transition-colors text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className={`h-1 rounded-full overflow-hidden ${done ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                <div
                  className={`h-full rounded-full transition-all duration-300 ${done ? 'bg-emerald-500' : 'bg-gray-900'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
