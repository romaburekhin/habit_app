'use client'

import { useEffect, useRef, useState } from 'react'
import { respondToChallenge, deleteChallenge, fetchChallengeCompletions, updateHabit } from '@/lib/api'
import type { ChallengeView } from '@/lib/types'
import { HABIT_COLORS, GRAY_COLOR } from '@/lib/colors'

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function MonthCalendar({ completedDates, color, onToggle }: {
  completedDates: Set<string> | null
  color: string | null
  onToggle: (date: string) => void
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = toLocalDate(today)
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const startDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const activeColor = color ?? '#9CA3AF'
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth()

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-black/8 transition-colors text-lg">‹</button>
        <span className="text-xs font-medium text-gray-600">{MONTH_NAMES[viewMonth]} {viewYear}</span>
        <button type="button" onClick={nextMonth} disabled={isCurrentMonth} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-black/8 transition-colors text-lg disabled:opacity-30">›</button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map(d => (
          <span key={d} className="text-center text-[10px] text-gray-400 font-medium">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isFuture = dateStr > todayStr
          const isToday = dateStr === todayStr
          const filled = !isFuture && (completedDates?.has(dateStr) ?? false)
          return (
            <button
              key={i}
              type="button"
              disabled={isFuture}
              onClick={() => onToggle(dateStr)}
              style={
                filled
                  ? { backgroundColor: activeColor }
                  : isToday
                  ? { border: `2px solid ${activeColor}` }
                  : undefined
              }
              className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-medium transition-opacity
                ${isFuture ? 'text-gray-300 cursor-default' : 'hover:opacity-75 cursor-pointer'}
                ${filled ? 'text-white' : 'text-gray-700'}
              `}
            >
              {String(day).padStart(2, '0')}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface Props {
  challenge: ChallengeView
  showHeatmap: boolean
  onAccepted: (challengeId: number) => void
  onDeclined: (challengeId: number) => void
  onDeleted: (challengeId: number) => void
  onColorChanged: (challengeId: number, color: string | null) => void
  onToggleDay: (habit_id: number, date: string) => void
}

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

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABEL_MAP: Record<number, string> = { 0: 'Mon', 2: 'Wed', 4: 'Fri' }

function YearGrid({ completedDates, color }: { completedDates: Set<string>; color: string | null }) {
  const weeks = buildWeeks()
  const cols = weeks.length
  const cells = weeks.flatMap((week, colIdx) =>
    week.map((date, dayIdx) => ({ date, colIdx, dayIdx }))
  )

  const allMonthLabels: { label: string; col: number }[] = []
  weeks.forEach((week, colIdx) => {
    const firstDate = week.find(d => d !== null)
    if (firstDate) {
      const d = new Date(firstDate)
      if (d.getDate() <= 7) allMonthLabels.push({ label: MONTH_LABELS[d.getMonth()], col: colIdx })
    }
  })
  const monthLabels: { label: string; col: number }[] = []
  let lastShownCol = -7
  for (const m of allMonthLabels) {
    if (m.col - lastShownCol >= 7) { monthLabels.push(m); lastShownCol = m.col }
  }

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: 'repeat(7, auto)',
    gridAutoFlow: 'column',
    gap: '1.5px',
  }

  return (
    <div>
      <div className="relative h-3 pl-5 mb-0.5">
        {monthLabels.map(({ label, col }) => (
          <span key={col} className="absolute text-[7px] text-gray-400 whitespace-nowrap" style={{ left: `calc(20px + ${(col / cols) * 100}%)` }}>
            {label}
          </span>
        ))}
      </div>
      <div className="relative pl-5">
        {[0, 1, 2, 3, 4, 5, 6].map(i =>
          DAY_LABEL_MAP[i] ? (
            <span key={i} className="absolute text-[8px] text-gray-400 leading-none" style={{ left: 0, width: '18px', textAlign: 'right', top: `${((i * 2 + 1) / 14) * 100}%`, transform: 'translateY(-50%)' }}>
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
                style={{ aspectRatio: '1', backgroundColor: date === null ? undefined : filled ? (color ?? undefined) : (color ? color + '30' : undefined) }}
                className={`rounded-[2px] ${date === null ? 'opacity-0' : filled ? (color ? '' : 'bg-emerald-500') : (color ? '' : 'bg-gray-200')}`}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ProgressBar({ value, goal, color }: { value: number; goal: number; color: string | null }) {
  const pct = Math.min(100, Math.round((value / goal) * 100))
  const barColor = color ?? '#10B981'
  const trackColor = 'rgba(255,255,255,0.6)'
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: trackColor }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: barColor }}
      />
    </div>
  )
}

function stats(value: number, goal: number): string {
  const pct = Math.min(100, Math.round((value / goal) * 100))
  return `${value}/${goal} days (${pct}%)${pct >= 100 ? ' 🎉' : ''}`
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (confirming) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4" onClick={() => setConfirming(false)}>
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative bg-white rounded-2xl px-5 py-5 w-full max-w-xs shadow-xl" onClick={e => e.stopPropagation()}>
          <p className="text-sm text-gray-800 font-medium mb-1">Leave shared goal?</p>
          <p className="text-xs text-gray-400 mb-4">Your habit stays, but the shared goal link will be removed.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirming(false)} className="flex-1 py-2 text-sm rounded-xl border border-black/12 text-gray-700 font-medium hover:bg-black/5 transition-colors">
              No, keep it
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={async () => { setDeleting(true); await onDelete() }}
              className="flex-1 py-2 text-sm rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {deleting ? '...' : 'Yes, leave'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <button type="button" onClick={() => setConfirming(true)} className="text-gray-300 hover:text-red-400 transition-colors text-base leading-none">
      ×
    </button>
  )
}

export default function ChallengeCard({ challenge, showHeatmap, onAccepted, onDeclined, onDeleted, onColorChanged, onToggleDay }: Props) {
  const [accepting, setAccepting] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [myDates, setMyDates] = useState<Set<string> | null>(null)
  const [theirDates, setTheirDates] = useState<Set<string> | null>(null)
  const [savingColor, setSavingColor] = useState(false)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (challenge.status !== 'accepted') return
    fetchChallengeCompletions(challenge.id).then(({ my_completions, their_completions }) => {
      setMyDates(new Set(my_completions))
      setTheirDates(new Set(their_completions))
    })
  }, [challenge.id, challenge.status])

  async function handleAccept() {
    setAccepting(true)
    try { await respondToChallenge(challenge.id, 'accept'); onAccepted(challenge.id) }
    finally { setAccepting(false) }
  }

  async function handleDecline() {
    setDeclining(true)
    try { await respondToChallenge(challenge.id, 'decline'); onDeclined(challenge.id) }
    finally { setDeclining(false) }
  }

  async function handleDelete() {
    await deleteChallenge(challenge.id)
    onDeleted(challenge.id)
  }

  async function handleSaveColor() {
    if (!challenge.my_habit) return
    setSavingColor(true)
    try {
      await updateHabit(challenge.my_habit.id, challenge.my_habit.name, challenge.my_habit.goal, selectedColor)
      onColorChanged(challenge.id, selectedColor)
      dialogRef.current?.close()
    } finally {
      setSavingColor(false)
    }
  }

  function openEditModal() {
    setSelectedColor(challenge.my_habit?.color ?? null)
    setConfirmLeave(false)
    dialogRef.current?.showModal()
  }

  const theirColor = challenge.their_habit?.color ?? null
  const myColor = challenge.my_habit?.color ?? null

  // Pending invite (I'm invitee)
  if (challenge.status === 'pending' && challenge.role === 'invitee') {
    return (
      <li className="rounded-2xl border border-gray-200 bg-white px-4 py-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Shared goal from</p>
            <p className="text-sm text-gray-800 truncate capitalize">{challenge.their_name ?? challenge.their_email}</p>
            {challenge.their_name && <p className="text-[11px] text-gray-400 truncate">{challenge.their_email}</p>}
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button type="button" onClick={handleDecline} disabled={declining} className="px-3 py-1.5 text-xs rounded-xl text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50">
              Decline
            </button>
            <button type="button" onClick={handleAccept} disabled={accepting} className="px-3 py-1.5 text-xs rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50">
              {accepting ? 'Joining...' : 'Accept'}
            </button>
          </div>
        </div>
        {challenge.their_habit && (
          <div className="space-y-1.5">
            <p className="text-xs text-gray-500">{challenge.their_habit.name}</p>
            <ProgressBar value={challenge.their_habit.completed_days} goal={challenge.their_habit.goal} color={myColor} />
          </div>
        )}
        <p className="text-[11px] text-gray-400">Accepting copies this habit to your list so you can track your own progress.</p>
      </li>
    )
  }

  // Pending (I'm inviter)
  if (challenge.status === 'pending' && challenge.role === 'inviter') {
    return (
      <li className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 px-4 py-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Waiting for</p>
            <p className="text-sm text-gray-700 truncate capitalize">{challenge.their_name ?? challenge.their_email}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <DeleteButton onDelete={handleDelete} />
            <span className="text-[10px] text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">Pending</span>
          </div>
        </div>
        {challenge.my_habit && (
          <div className="space-y-1.5">
            <p className="text-xs text-gray-500">{challenge.my_habit.name}</p>
            <ProgressBar value={challenge.my_habit.completed_days} goal={challenge.my_habit.goal} color={myColor} />
          </div>
        )}
      </li>
    )
  }

  // Accepted challenge
  if (!challenge.my_habit || !challenge.their_habit) return null

  const myPct = Math.min(100, Math.round((challenge.my_habit.completed_days / challenge.my_habit.goal) * 100))
  const theirPct = Math.min(100, Math.round((challenge.their_habit.completed_days / challenge.their_habit.goal) * 100))
  const leading = myPct > theirPct ? 'me' : theirPct > myPct ? 'them' : 'tie'
  const myWon = challenge.my_habit.completed_days >= challenge.my_habit.goal
  const theirWon = challenge.their_habit.completed_days >= challenge.their_habit.goal
  const theirFirstName = (challenge.their_name ?? challenge.their_email).split(' ')[0]

  const cardBg = (myColor ?? '#F3F4F6') + '40'
  const labelColor = myColor ? { color: myColor, filter: 'brightness(0.7)' } : undefined
  const activeColor = selectedColor ?? '#E5E7EB'

  return (
    <li
      className="rounded-2xl border border-transparent px-3 py-4 space-y-3 cursor-pointer transition-all hover:opacity-90"
      style={{ backgroundColor: cardBg }}
      onClick={openEditModal}
    >
      <dialog
        ref={dialogRef}
        onClose={() => setConfirmLeave(false)}
        onClick={e => { if (e.target === dialogRef.current) dialogRef.current?.close() }}
        style={{ background: `linear-gradient(${activeColor}33, ${activeColor}33), white` }}
        className="fixed inset-0 m-auto rounded-2xl border-0 p-0 shadow-2xl backdrop:bg-black/40 w-[calc(100%-2rem)] max-w-sm max-h-[90dvh] overflow-y-auto"
      >
        <div className="p-4 space-y-4" onClick={e => e.stopPropagation()}>
          {confirmLeave ? (
            <>
              <p className="text-sm font-medium text-gray-800">Leave shared goal?</p>
              <p className="text-xs text-gray-400">Your habit stays, but the shared goal link will be removed.</p>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setConfirmLeave(false)} className="flex-1 py-2 text-sm rounded-xl border border-black/12 text-gray-700 font-medium hover:bg-black/5 transition-colors">
                  No, keep it
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={async () => { setDeleting(true); dialogRef.current?.close(); await handleDelete() }}
                  className="flex-1 py-2 text-sm rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {deleting ? '...' : 'Yes, leave'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-800 truncate">{challenge.my_habit.name}</p>
              {(myWon || theirWon) && (
                <div
                  className="rounded-2xl px-4 py-3 flex items-center gap-3"
                  style={{ backgroundColor: (myColor ?? '#10B981') + '28' }}
                >
                  <span className="text-2xl leading-none shrink-0">
                    {myWon && theirWon ? '🎉' : '🏆'}
                  </span>
                  <div className="min-w-0">
                    {myWon && theirWon ? (
                      <>
                        <p className="text-xs font-semibold" style={labelColor ?? { color: '#10B981' }}>You both won!</p>
                        <p className="text-[11px] text-gray-400">Goal achieved together</p>
                      </>
                    ) : myWon ? (
                      <>
                        <p className="text-xs font-semibold" style={labelColor ?? { color: '#10B981' }}>You are the winner!</p>
                        <p className="text-[11px] text-gray-400">Goal achieved this month</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-semibold text-gray-700 capitalize">{theirFirstName} is the winner!</p>
                        <p className="text-[11px] text-gray-400">They reached the goal first</p>
                      </>
                    )}
                  </div>
                </div>
              )}
              <MonthCalendar
                completedDates={myDates}
                color={myColor}
                onToggle={(date) => {
                  if (!challenge.my_habit) return
                  setMyDates(prev => {
                    const next = new Set(prev)
                    if (next.has(date)) next.delete(date); else next.add(date)
                    return next
                  })
                  onToggleDay(challenge.my_habit.id, date)
                }}
              />
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Habit color</label>
                <div className="flex gap-2 flex-wrap">
                  {HABIT_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      style={{ backgroundColor: c }}
                      className="w-8 h-8 rounded-full transition-all hover:scale-105 flex items-center justify-center"
                    >
                      {selectedColor === c && <span className="w-3 h-3 rounded-full bg-white block" />}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedColor(GRAY_COLOR)}
                    style={{ backgroundColor: GRAY_COLOR }}
                    className="w-8 h-8 rounded-full transition-all hover:scale-105 flex items-center justify-center"
                  >
                    {selectedColor === GRAY_COLOR && <span className="w-3 h-3 rounded-full bg-white block" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setConfirmLeave(true)}
                  className="px-4 py-2.5 text-sm rounded-lg text-gray-500 hover:bg-black/8 transition-colors"
                >
                  Leave
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => dialogRef.current?.close()} className="px-4 py-2.5 text-sm rounded-lg text-gray-500 hover:bg-black/8">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveColor}
                    disabled={savingColor}
                    style={{ backgroundColor: activeColor }}
                    className="px-4 py-2 text-sm rounded-lg text-gray-800 font-medium disabled:opacity-40"
                  >
                    {savingColor ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <span style={labelColor} className={`text-sm font-normal tracking-tight truncate ${!myColor ? 'text-gray-700' : ''}`}>
          {challenge.my_habit.name}
        </span>
        <div className="flex items-center shrink-0 ml-2">
          {!myWon && !theirWon && leading === 'me' && <span className="text-[11px]" style={labelColor ?? { color: '#10B981' }}>You're ahead 😎</span>}
          {!myWon && !theirWon && leading === 'them' && <span className="text-[11px] capitalize" style={labelColor ?? { color: '#9CA3AF' }}>{theirFirstName} ahead</span>}
          {!myWon && !theirWon && leading === 'tie' && <span className="text-[11px]" style={labelColor ?? { color: '#9CA3AF' }}>Even</span>}
        </div>
      </div>

      {/* Winner banner */}
      {(myWon || theirWon) && (
        <div
          className="rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{ backgroundColor: (myColor ?? '#10B981') + '28' }}
        >
          <span className="text-2xl leading-none shrink-0">
            {myWon && theirWon ? '🎉' : '🏆'}
          </span>
          <div className="min-w-0">
            {myWon && theirWon ? (
              <>
                <p className="text-xs font-semibold" style={labelColor ?? { color: '#10B981' }}>You both won!</p>
                <p className="text-[11px] text-gray-400">Goal achieved together</p>
              </>
            ) : myWon ? (
              <>
                <p className="text-xs font-semibold" style={labelColor ?? { color: '#10B981' }}>You are the winner!</p>
                <p className="text-[11px] text-gray-400">Goal achieved this month</p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold text-gray-700 capitalize">{theirFirstName} is the winner!</p>
                <p className="text-[11px] text-gray-400">They reached the goal first</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* You */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-gray-400 tracking-widest">You</p>
          <span className="text-[11px] text-gray-400 shrink-0">{stats(challenge.my_habit.completed_days, challenge.my_habit.goal)}</span>
        </div>
        {showHeatmap && (myDates
          ? <YearGrid completedDates={myDates} color={myColor} />
          : <div className="h-10 rounded-lg bg-black/5 animate-pulse" />
        )}
        {!showHeatmap && <ProgressBar value={challenge.my_habit.completed_days} goal={challenge.my_habit.goal} color={myColor} />}
      </div>

      <div className="border-t border-black/8" />

      {/* Them */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-gray-400 tracking-widest truncate capitalize">{challenge.their_name ?? challenge.their_email}</p>
          <span className="text-[11px] text-gray-400 shrink-0">{stats(challenge.their_habit.completed_days, challenge.their_habit.goal)}</span>
        </div>
        {showHeatmap && (theirDates
          ? <YearGrid completedDates={theirDates} color={theirColor} />
          : <div className="h-10 rounded-lg bg-black/5 animate-pulse" />
        )}
        {!showHeatmap && <ProgressBar value={challenge.their_habit.completed_days} goal={challenge.their_habit.goal} color={myColor} />}
      </div>
    </li>
  )
}
