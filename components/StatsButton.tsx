'use client'

import { useState, useEffect, useRef } from 'react'
import { COLOR_VARIANTS } from '@/lib/colors'
import { Habit, Completion } from '@/lib/types'

type Period = 'week' | '2w' | '1m' | '3m' | 'all'

const PERIODS: { label: string; value: Period }[] = [
  { label: 'This week', value: 'week' },
  { label: '2 weeks', value: '2w' },
  { label: 'Month', value: '1m' },
  { label: '3 months', value: '3m' },
  { label: 'All time', value: 'all' },
]
const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function fmt(d: Date) { return d.toISOString().slice(0, 10) }

function getWeekDates(offset: number): string[] {
  const today = new Date()
  const dow = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return fmt(d)
  })
}

function getDatesForPeriod(period: Exclude<Period, 'week'>, earliestDate?: string): string[] {
  const today = new Date()
  const allTimeDays = earliestDate
    ? Math.max(90, Math.ceil((today.getTime() - new Date(earliestDate).getTime()) / 86400000) + 1)
    : 90
  const dayCount = period === '2w' ? 14 : period === '1m' ? 30 : period === '3m' ? 90 : allTimeDays
  return Array.from({ length: dayCount }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - (dayCount - 1 - i)); return fmt(d)
  })
}

function weekLabel(dates: string[]): string {
  const from = new Date(dates[0] + 'T00:00:00')
  const to = new Date(dates[6] + 'T00:00:00')
  const fromStr = from.toLocaleDateString('en', { month: 'short', day: 'numeric' })
  const toStr = from.getMonth() === to.getMonth()
    ? String(to.getDate())
    : to.toLocaleDateString('en', { month: 'short', day: 'numeric' })
  return `${fromStr} – ${toStr}`
}

function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i]
    const cpx = (x0 + x1) / 2
    d += ` C ${cpx},${y0} ${cpx},${y1} ${x1},${y1}`
  }
  return d
}

// ─── Week dot grid ───────────────────────────────────────────────────────────

function WeekGrid({ habits, completions, dates }: {
  habits: Habit[]; completions: Completion[]; dates: string[]
}) {
  const today = fmt(new Date())
  const COL = 'minmax(0,1fr) repeat(7,2rem) 2.75rem'
  const GAP = '0 4px'
  return (
    <div className="px-4 pb-5">
      <div className="grid mb-2" style={{ gridTemplateColumns: COL, gap: GAP }}>
        <div />
        {dates.map((d, i) => {
          const isToday = d === today
          return (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className={`text-[10px] font-bold tracking-wide ${isToday ? 'text-gray-800' : 'text-gray-300'}`}>
                {DAY_ABBR[i]}
              </span>
            </div>
          )
        })}
        <div />
      </div>
      <div className="space-y-0">
        {habits.map(h => {
          const done = new Set(completions.filter(c => c.habit_id === h.id).map(c => c.date))
          const count = dates.filter(d => done.has(d)).length
          const color = h.color ?? '#9CA3AF'
          const filledColor = COLOR_VARIANTS[color]?.filled ?? color
          return (
            <div key={h.id} className="grid items-center py-2 border-b border-gray-50 last:border-0"
              style={{ gridTemplateColumns: COL, gap: GAP }}
            >
              <span className="text-sm text-gray-800 font-medium truncate pr-2">{h.name}</span>
              {dates.map((d, i) => {
                const isDone = done.has(d)
                return (
                  <div key={i} className="flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full transition-colors"
                      style={{
                        backgroundColor: isDone ? filledColor : '#F3F4F6',
                        boxShadow: isDone ? `0 1px 3px ${filledColor}66` : 'none',
                      }}
                    />
                  </div>
                )
              })}
              <span className="text-xs text-gray-700 text-right tabular-nums pl-1">
                {count}<span className="text-gray-300">/7</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Line chart ──────────────────────────────────────────────────────────────

const CHART_H = 180
const PAD = { top: 16, right: 16, bottom: 28, left: 28 }

function LineChart({ habits, completions, dates, focusId, onFocus }: {
  habits: Habit[]
  completions: Completion[]
  dates: string[]
  focusId: number | null
  onFocus: (id: number | null) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(320)

  useEffect(() => {
    const el = ref.current; if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(e => setWidth(e[0].contentRect.width))
    ro.observe(el); return () => ro.disconnect()
  }, [])

  const plotW = width - PAD.left - PAD.right
  const plotH = CHART_H - PAD.top - PAD.bottom
  const n = dates.length

  const series = habits.map(h => {
    const done = new Set(completions.filter(c => c.habit_id === h.id).map(c => c.date))
    let cum = 0
    const values = dates.map(d => { if (done.has(d)) cum++; return cum })
    const color = COLOR_VARIANTS[h.color ?? '#9CA3AF']?.filled ?? h.color ?? '#9CA3AF'
    return { habit: h, values, color }
  })

  const visibleSeries = focusId ? series.filter(s => s.habit.id === focusId) : series
  const maxVal = Math.max(1, ...visibleSeries.flatMap(s => s.values))
  const xScale = (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2)
  const yScale = (v: number) => PAD.top + plotH - (v / maxVal) * plotH

  const yTicks = maxVal <= 5
    ? Array.from({ length: maxVal + 1 }, (_, i) => i)
    : [0, Math.round(maxVal / 2), maxVal]

  const xStep = Math.max(1, Math.ceil(n / 5))
  const xLabels = dates
    .map((d, i) => ({ d, i }))
    .filter(({ i }) => i === 0 || i === n - 1 || i % xStep === 0)
    .map(({ d, i }) => ({
      i, label: new Date(d + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })
    }))

  return (
    <div className="pb-2">
      <div ref={ref} className="w-full px-2">
        <svg width={width - 16} height={CHART_H}>
          {/* Grid lines */}
          {yTicks.map(v => (
            <g key={v}>
              <line
                x1={PAD.left} y1={yScale(v)}
                x2={PAD.left + plotW - 16} y2={yScale(v)}
                stroke={v === 0 ? '#E5E7EB' : '#F3F4F6'} strokeWidth="1"
                strokeDasharray={v === 0 ? undefined : '3 3'}
              />
              <text x={PAD.left - 6} y={yScale(v) + 4} textAnchor="end" fill="#C9CDD4" fontSize={10}>{v}</text>
            </g>
          ))}
          {xLabels.map(({ i, label }) => (
            <text key={i} x={xScale(i)} y={CHART_H - 6} textAnchor="middle" fill="#C9CDD4" fontSize={10}>{label}</text>
          ))}

          {/* Faded lines first (background) */}
          {focusId && series.filter(s => s.habit.id !== focusId).map(({ habit, values, color }) => {
            const pts: [number, number][] = values.map((v, i) => [xScale(i), yScale(v)])
            return (
              <path key={habit.id} d={smoothPath(pts)} fill="none"
                stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.15" />
            )
          })}

          {/* Active lines (foreground) */}
          {visibleSeries.map(({ habit, values, color }) => {
            const pts: [number, number][] = values.map((v, i) => [xScale(i), yScale(v)])
            const linePath = smoothPath(pts)
            const last = pts[pts.length - 1]
            return (
              <g key={habit.id}>
                <path d={linePath} fill="none" stroke={color} strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" />
                <circle cx={last[0]} cy={last[1]} r="3.5" fill="white" stroke={color} strokeWidth="2" />
              </g>
            )
          })}
        </svg>
      </div>

      {/* Clickable legend */}
      <div className="flex flex-wrap gap-2 px-5 pt-2 pb-4">
        {[...series]
          .sort((a, b) => b.values[b.values.length - 1] - a.values[a.values.length - 1])
          .map(({ habit, color }) => {
            const isFocused = focusId === habit.id
            const isDimmed = focusId !== null && !isFocused
            return (
              <button
                key={habit.id}
                onClick={() => onFocus(isFocused ? null : habit.id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all focus:outline-none"
                style={{
                  border: isFocused ? `1.5px solid ${color}` : '1.5px solid transparent',
                  backgroundColor: isFocused ? 'white' : isDimmed ? 'transparent' : '#F9FAFB',
                  opacity: isDimmed ? 0.35 : 1,
                }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs text-gray-700">{habit.name}</span>
              </button>
            )
          })}
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function StatsButton() {
  const [open, setOpen] = useState(false)
  const [period, setPeriod] = useState<Period>('week')
  const [weekOffset, setWeekOffset] = useState(0)
  const [habits, setHabits] = useState<Habit[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [dates, setDates] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [focusId, setFocusId] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    fetch('/api/habits').then(r => r.json()).then((h: Habit[]) => {
      if (cancelled) return
      const active = Array.isArray(h) ? h.filter(h => h.completed_days < h.goal) : []
      const earliest = active.length ? active.map(h => h.created_at).sort()[0]?.slice(0, 10) : undefined
      const d = period === 'week' ? getWeekDates(weekOffset) : getDatesForPeriod(period, earliest)
      setHabits(active)
      setDates(d)
      return fetch(`/api/completions?from=${d[0]}&to=${d[d.length - 1]}`).then(r => r.json())
    }).then(c => {
      if (cancelled) return
      setCompletions(Array.isArray(c) ? c : [])
      setLoading(false)
    }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, period, weekOffset])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Statistics"
        className="w-8 h-8 flex items-center justify-center rounded-lg transition-all focus:outline-none text-gray-400 hover:text-gray-600 hover:bg-gray-100"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="12" width="4" height="8" rx="1" />
          <rect x="10" y="7" width="4" height="13" rx="1" />
          <rect x="17" y="2" width="4" height="18" rx="1" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />

          <div className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <h2 className="text-base font-semibold text-gray-900">Statistics</h2>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all focus:outline-none"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Period label + scrollable pills */}
            <div className="flex-shrink-0 pb-3">
              <p className="text-xs text-gray-400 font-medium px-5 mb-2">Your progress for</p>
              <div className="flex gap-2 overflow-x-auto px-5 pb-0.5" style={{ scrollbarWidth: 'none' }}>
                {PERIODS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => { setPeriod(p.value); setFocusId(null); if (p.value !== 'week') setWeekOffset(0) }}
                    className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all focus:outline-none ${
                      period === p.value
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Week navigator */}
            {period === 'week' && (
              <div className="flex items-center gap-1 px-5 pb-3 flex-shrink-0">
                <button
                  onClick={() => setWeekOffset(w => w - 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all focus:outline-none flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <div className="flex-1 text-center">
                  <span className="text-xs font-semibold text-gray-700">
                    {weekOffset === 0 ? 'Current week' : weekLabel(dates)}
                  </span>
                </div>
                <button
                  onClick={() => setWeekOffset(w => w + 1)}
                  disabled={weekOffset >= 0}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all focus:outline-none disabled:opacity-20 disabled:pointer-events-none flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <svg className="w-5 h-5 animate-spin text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                </div>
              ) : habits.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <p className="text-sm text-gray-400">No habits yet</p>
                </div>
              ) : period === 'week' ? (
                <WeekGrid habits={habits} completions={completions} dates={dates} />
              ) : (
                <LineChart
                  habits={habits}
                  completions={completions}
                  dates={dates}
                  focusId={focusId}
                  onFocus={setFocusId}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
