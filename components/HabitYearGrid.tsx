import { useEffect, useRef } from 'react'
import type { Habit } from '@/lib/types'
import { COLOR_VARIANTS } from '@/lib/colors'

interface Props {
  habit: Habit
  completedDates: Set<string>
  onEdit: (habit: Habit) => void
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABEL_MAP: Record<number, string> = { 0: 'Mon', 2: 'Wed', 4: 'Fri' }

// Fixed cell size to match the ~30-week visual size
const CELL = 7   // px
const GAP = 2    // px
const COL_UNIT = CELL + GAP  // 9px per column slot
const LABEL_W = 20 // px (pl-5)

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
  const MIN_GAP = 4
  const monthLabels: { label: string; col: number }[] = []
  let lastShownCol = -MIN_GAP
  for (const m of allMonthLabels) {
    if (m.col - lastShownCol >= MIN_GAP) {
      monthLabels.push(m)
      lastShownCol = m.col
    }
  }

  const cells = weeks.flatMap((week, colIdx) =>
    week.map((date, dayIdx) => ({ date, colIdx, dayIdx }))
  )

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, ${CELL}px)`,
    gridTemplateRows: 'repeat(7, auto)',
    gridAutoFlow: 'column',
    gap: `${GAP}px`,
  }

  const innerWidth = LABEL_W + cols * COL_UNIT

  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
  }, [])

  const variants = COLOR_VARIANTS[habit.color ?? '']
  const cardBg = variants?.card ?? (habit.color ? habit.color + '40' : undefined)
  const filledColor = variants?.filled ?? habit.color ?? undefined
  const unfilledColor = variants?.unfilled ?? (habit.color ? habit.color + '35' : undefined)

  return (
    <li
      onClick={() => onEdit(habit)}
      style={habit.color ? { backgroundColor: cardBg } : undefined}
      className={`rounded-2xl border px-[11px] py-[11px] cursor-pointer transition-all ${
        habit.color
          ? 'border-transparent hover:opacity-90'
          : done
          ? 'bg-emerald-950 border-emerald-900 hover:border-emerald-800'
          : 'bg-gray-900 border-gray-800 hover:border-gray-700'
      }`}
    >
      {/* Header */}
      <div className="mb-[8px]">
        <span
          style={habit.color ? { color: filledColor } : undefined}
          className={`text-sm font-normal tracking-tight truncate block ${!habit.color && (done ? 'text-emerald-400' : 'text-gray-100')}`}
        >
          {habit.name}
        </span>
      </div>

      {/* Scrollable heatmap */}
      <div ref={scrollRef} className="overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }} onClick={e => e.stopPropagation()}>
        <div style={{ width: `${innerWidth}px` }}>
          {/* Month labels */}
          <div className="relative h-3 mb-0.5" style={{ paddingLeft: `${LABEL_W}px` }}>
            {monthLabels.map(({ label, col }) => (
              <span
                key={col}
                className="absolute text-[7px] text-gray-500 whitespace-nowrap"
                style={{ left: `${LABEL_W + col * COL_UNIT}px` }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Day labels + grid */}
          <div className="relative" style={{ paddingLeft: `${LABEL_W}px` }}>
            {[0, 1, 2, 3, 4, 5, 6].map(i =>
              DAY_LABEL_MAP[i] ? (
                <span
                  key={i}
                  className="absolute text-[8px] text-gray-500 leading-none"
                  style={{
                    left: 0,
                    width: `${LABEL_W - 2}px`,
                    textAlign: 'right',
                    top: `${((i * 2 + 1) / 14) * 100}%`,
                    transform: 'translateY(-50%)',
                  }}
                >
                  {DAY_LABEL_MAP[i]}
                </span>
              ) : null
            )}

            <div style={gridStyle}>
              {cells.map(({ date, colIdx, dayIdx }) => {
                const filled = date ? completedDates.has(date) : false
                return (
                  <div
                    key={`${colIdx}-${dayIdx}`}
                    style={{
                      width: `${CELL}px`,
                      height: `${CELL}px`,
                      backgroundColor: date === null
                        ? undefined
                        : filled
                        ? filledColor
                        : unfilledColor,
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
        </div>
      </div>

      {/* Progress */}
      <div className="mt-[5px]">
        <span
          style={done && habit.color ? { color: filledColor } : undefined}
          className={`text-[11px] ${done ? (habit.color ? '' : 'text-emerald-400 font-medium') : 'text-gray-500'}`}
        >
          {count}/{habit.goal} days ({pct}%){done ? ' 🎉' : ''}
        </span>
      </div>
    </li>
  )
}
