import type { Habit } from '@/lib/types'

interface Props {
  habit: Habit
  completedDates: Set<string>
  onEdit: (habit: Habit) => void
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
// Show Mon, Wed, Fri labels only (indices 0, 2, 4)
const DAY_LABEL_MAP: Record<number, string> = { 0: 'Mon', 2: 'Wed', 4: 'Fri' }

function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildWeeks(): (string | null)[][] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = toLocalDate(today)

  const startDate = new Date(today)
  startDate.setDate(today.getDate() - 364)
  const dow = (startDate.getDay() + 6) % 7
  startDate.setDate(startDate.getDate() - dow)

  const weeks: (string | null)[][] = []
  const d = new Date(startDate)

  while (true) {
    const week: (string | null)[] = []
    for (let i = 0; i < 7; i++) {
      const ds = toLocalDate(d)
      week.push(ds <= todayStr ? ds : null)
      d.setDate(d.getDate() + 1)
    }
    weeks.push(week)
    if (d > today || weeks.length > 60) break
  }

  return weeks
}

export default function HabitYearGrid({ habit, completedDates, onEdit }: Props) {
  const weeks = buildWeeks()
  const cols = weeks.length

  const count = habit.completed_days
  const pct = Math.round((count / habit.goal) * 100)
  const done = count >= habit.goal

  // Find first week of each month, then filter to avoid label overlap.
  // MIN_GAP = 7 columns ≈ every ~2 months on mobile.
  const allMonthLabels: { label: string; col: number }[] = []
  weeks.forEach((week, colIdx) => {
    const firstDate = week.find(d => d !== null)
    if (firstDate) {
      const d = new Date(firstDate)
      if (d.getDate() <= 7) {
        allMonthLabels.push({ label: MONTH_LABELS[d.getMonth()], col: colIdx })
      }
    }
  })
  const MIN_GAP = 7
  const monthLabels: { label: string; col: number }[] = []
  let lastShownCol = -MIN_GAP
  for (const m of allMonthLabels) {
    if (m.col - lastShownCol >= MIN_GAP) {
      monthLabels.push(m)
      lastShownCol = m.col
    }
  }

  // Flat cells array in column-major order (week0_day0, week0_day1..., week1_day0...)
  const cells = weeks.flatMap((week, colIdx) =>
    week.map((date, dayIdx) => ({ date, colIdx, dayIdx }))
  )

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: 'repeat(7, auto)',
    gridAutoFlow: 'column',
    gap: '1.5px',
  }

  return (
    <li
      onClick={() => onEdit(habit)}
      style={habit.color ? { backgroundColor: habit.color + '18' } : undefined}
      className={`rounded-2xl border px-3 py-4 cursor-pointer transition-all ${
        habit.color
          ? 'border-transparent hover:opacity-90'
          : done
          ? 'bg-emerald-950 border-emerald-900 hover:border-emerald-800'
          : 'bg-gray-900 border-gray-800 hover:border-gray-700'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span
          style={habit.color ? { color: habit.color, filter: 'brightness(0.85)' } : undefined}
          className={`text-sm font-normal tracking-tight truncate ${!habit.color && (done ? 'text-emerald-400' : 'text-gray-100')}`}
        >
          {habit.name}
        </span>
        <span
          style={done && habit.color ? { color: habit.color, filter: 'brightness(0.85)' } : undefined}
          className={`text-[11px] ml-2 shrink-0 ${done ? (habit.color ? '' : 'text-emerald-400 font-medium') : 'text-gray-500'}`}
        >
          {count}/{habit.goal} days ({pct}%){done ? ' 🎉' : ''}
        </span>
      </div>

      {/* Month labels */}
      <div className="relative h-3 pl-5 mb-0.5">
        {monthLabels.map(({ label, col }) => (
          <span
            key={col}
            className="absolute text-[7px] text-gray-500 whitespace-nowrap"
            style={{ left: `calc(20px + ${(col / cols) * 100}%)` }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Heatmap: day labels (absolute) + unified 2D grid */}
      <div className="relative pl-5">
        {/* Day labels centered on their respective rows */}
        {[0, 1, 2, 3, 4, 5, 6].map(i =>
          DAY_LABEL_MAP[i] ? (
            <span
              key={i}
              className="absolute text-[8px] text-gray-500 leading-none"
              style={{
                left: 0,
                width: '18px',
                textAlign: 'right',
                top: `${((i * 2 + 1) / 14) * 100}%`,
                transform: 'translateY(-50%)',
              }}
            >
              {DAY_LABEL_MAP[i]}
            </span>
          ) : null
        )}

        {/* Single unified 2D grid — all 7 rows share one grid, guaranteeing alignment */}
        <div style={gridStyle}>
          {cells.map(({ date, colIdx, dayIdx }) => {
            const filled = date ? completedDates.has(date) : false
            return (
              <div
                key={`${colIdx}-${dayIdx}`}
                style={{
                  aspectRatio: '1',
                  backgroundColor: date === null
                    ? undefined
                    : filled
                    ? (habit.color ?? undefined)
                    : (habit.color ? habit.color + '35' : undefined),
                }}
                className={`rounded-[2px] ${
                  date === null
                    ? 'opacity-0'
                    : filled
                    ? habit.color ? '' : 'bg-emerald-500'
                    : habit.color ? '' : 'bg-gray-700'
                }`}
              />
            )
          })}
        </div>
      </div>
    </li>
  )
}
