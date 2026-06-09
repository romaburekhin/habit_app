'use client'

import { useEffect, useRef, useState } from 'react'
import { respondToChallenge, deleteChallenge, fetchChallengeCompletions, updateHabit, respondToUpdate } from '@/lib/api'
import type { ChallengeView } from '@/lib/types'
import { HABIT_COLORS, GRAY_COLOR, COLOR_VARIANTS } from '@/lib/colors'
import EditChallengeModal from './EditChallengeModal'

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function MonthCalendar({ completedDates, color, minDate, onToggle }: {
  completedDates: Set<string> | null
  color: string | null
  minDate?: string
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
          const isBefore = !!minDate && dateStr < minDate
          const isDisabled = isFuture || isBefore
          const isToday = dateStr === todayStr
          const filled = !isDisabled && (completedDates?.has(dateStr) ?? false)
          return (
            <button
              key={i}
              type="button"
              disabled={isDisabled}
              onClick={() => onToggle(dateStr)}
              style={
                filled
                  ? { backgroundColor: activeColor }
                  : isToday
                  ? { border: `2px solid ${activeColor}` }
                  : undefined
              }
              className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-medium transition-opacity
                ${isDisabled ? 'text-gray-300 cursor-default' : 'hover:opacity-75 cursor-pointer'}
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

const CELL = 7
const GAP = 2
const COL_UNIT = CELL + GAP
const LABEL_W = 20

function YearGrid({ completedDates, color }: { completedDates: Set<string>; color: string | null }) {
  const variants = COLOR_VARIANTS[color ?? '']
  const filledColor = variants?.filled ?? color ?? undefined
  const unfilledColor = variants?.unfilled ?? (color ? color + '35' : undefined)
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
  let lastShownCol = -4
  for (const m of allMonthLabels) {
    if (m.col - lastShownCol >= 4) { monthLabels.push(m); lastShownCol = m.col }
  }

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

  return (
    <div ref={scrollRef} className="overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
      <div style={{ width: `${innerWidth}px` }}>
        <div className="relative h-3 mb-0.5" style={{ paddingLeft: `${LABEL_W}px` }}>
          {monthLabels.map(({ label, col }) => (
            <span key={col} className="absolute text-[7px] text-gray-500 whitespace-nowrap" style={{ left: `${LABEL_W + col * COL_UNIT}px` }}>
              {label}
            </span>
          ))}
        </div>
        <div className="relative" style={{ paddingLeft: `${LABEL_W}px` }}>
          {[0, 1, 2, 3, 4, 5, 6].map(i =>
            DAY_LABEL_MAP[i] ? (
              <span key={i} className="absolute text-[8px] text-gray-500 leading-none" style={{ left: 0, width: `${LABEL_W - 2}px`, textAlign: 'right', top: `${((i * 2 + 1) / 14) * 100}%`, transform: 'translateY(-50%)' }}>
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
                  style={{ width: `${CELL}px`, height: `${CELL}px`, backgroundColor: date === null ? undefined : filled ? filledColor : unfilledColor }}
                  className={`rounded-[2px] ${date === null ? 'opacity-0' : filled ? (color ? '' : 'bg-emerald-500') : (color ? '' : 'bg-gray-200')}`}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProgressBar({ value, goal, color }: { value: number; goal: number; color: string | null }) {
  const pct = Math.min(100, Math.round((value / goal) * 100))
  const barColor = color ?? '#10B981'
  return (
    <div className="h-2 rounded-full overflow-hidden bg-black/10">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: barColor }}
      />
    </div>
  )
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
              onClick={() => { setDeleting(true); onDelete() }}
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
  const [showEdit, setShowEdit] = useState(false)
  const [respondingUpdate, setRespondingUpdate] = useState(false)
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

  const myColor = challenge.my_habit?.color ?? null
  const myFilledColor = myColor ? (COLOR_VARIANTS[myColor]?.filled ?? myColor) : null

  // Pending invite (I'm invitee)
  if (challenge.status === 'pending' && challenge.role === 'invitee') {
    const habitColor = challenge.their_habit?.color ?? null
    const accentColor = habitColor ? (COLOR_VARIANTS[habitColor]?.filled ?? habitColor) : '#6B7280'
    const bgColor = habitColor ? ((COLOR_VARIANTS[habitColor]?.card ?? habitColor) + '30') : '#F9FAFB'
    const senderName = challenge.their_name ?? challenge.their_email
    const initials = senderName[0].toUpperCase()
    const periodEndStr = challenge.period_end
      ? new Date(challenge.period_end + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
      : null

    return (
      <li className="rounded-2xl overflow-hidden border border-gray-100 bg-white">
        {/* Color accent bar */}
        <div className="h-1 w-full" style={{ backgroundColor: accentColor }} />

        <div className="px-4 pt-4 pb-4 space-y-4">
          {/* Sender row */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
              style={{ backgroundColor: accentColor }}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{senderName}</p>
              {challenge.their_name && <p className="text-[11px] text-gray-400 truncate">{challenge.their_email}</p>}
            </div>
            <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0"
              style={{ backgroundColor: bgColor, color: accentColor }}>
              Challenge
            </span>
          </div>

          {/* Challenge info */}
          <div className="rounded-xl px-3 py-3 space-y-2" style={{ backgroundColor: bgColor }}>
            <p className="text-sm font-semibold text-gray-800">{challenge.their_habit?.name}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {challenge.description && (
                <span className="text-xs text-gray-500">🏆 {challenge.description}</span>
              )}
              {periodEndStr && (
                <span className="text-xs text-gray-400">📅 Ends {periodEndStr}</span>
              )}
              {challenge.their_habit && (
                <span className="text-xs text-gray-400">🎯 {challenge.their_habit.goal} days</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button type="button" onClick={handleDecline} disabled={declining}
              className="flex-1 py-2.5 text-sm rounded-xl text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 font-medium">
              Decline
            </button>
            <button type="button" onClick={handleAccept} disabled={accepting}
              className="flex-1 py-2.5 text-sm rounded-xl text-white transition-colors disabled:opacity-50 font-medium"
              style={{ backgroundColor: accentColor }}>
              {accepting ? 'Joining...' : 'Accept challenge'}
            </button>
          </div>
        </div>
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
  const _periodEndedByDate = !!challenge.period_end && new Date().toISOString().slice(0, 10) > challenge.period_end
  const _startForEnded = new Date(challenge.start_date ?? challenge.created_at); _startForEnded.setHours(0,0,0,0)
  const _todayForEnded = new Date(); _todayForEnded.setHours(0,0,0,0)
  const _daysPassedForEnded = Math.max(0, Math.floor((_todayForEnded.getTime() - _startForEnded.getTime()) / 86400000) + 1)
  const periodEnded = _periodEndedByDate || _daysPassedForEnded >= (challenge.my_habit?.goal ?? Infinity)
  const myDone = challenge.my_habit.completed_days
  const theirDone = challenge.their_habit.completed_days
  const myHitGoal = myDone >= challenge.my_habit.goal
  const theirHitGoal = theirDone >= challenge.their_habit.goal
  const periodTie = periodEnded && !myHitGoal && !theirHitGoal && myDone === theirDone
  const myWon = myHitGoal || (periodEnded && !periodTie && myDone > theirDone)
  const theirWon = theirHitGoal || (periodEnded && !periodTie && theirDone > myDone)
  const theirFirstName = (challenge.their_name ?? challenge.their_email).split(' ')[0]

  const cardBg = '#ECEEF1'
  const activeColor = selectedColor ?? '#E5E7EB'

  return (
    <li
      className="relative rounded-2xl border border-transparent px-3 py-4 space-y-3 cursor-pointer transition-all hover:opacity-90"
      style={{ backgroundColor: cardBg }}
      onClick={openEditModal}
    >
      <dialog
        ref={dialogRef}
        onClose={() => setConfirmLeave(false)}
        onClick={e => { e.stopPropagation(); if (e.target === dialogRef.current) dialogRef.current?.close() }}
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
              <div className="space-y-2">
                <p className="text-base font-bold text-gray-800 truncate">{challenge.my_habit.name}</p>
                {(() => {
                  const fmtD = (d: string) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
                  const fmtShort = (d: string) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })
                  const startRaw = challenge.start_date ?? challenge.created_at
                  const period = challenge.period_end
                    ? `${fmtShort(startRaw)} – ${fmtD(challenge.period_end)}`
                    : `Since ${fmtD(startRaw)}`
                  const days = challenge.my_habit?.goal
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold text-gray-500">{days} days</span>
                        <span className="text-gray-200">·</span>
                        <span className="text-[11px] text-gray-400">{period}</span>
                      </div>
                      {!!challenge.description && !myWon && !theirWon && (
                        <div className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 bg-black/5">
                          <span className="text-xs">🎁</span>
                          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Prize</span>
                          <span className="text-[11px] text-gray-700 font-semibold">{challenge.description}</span>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
              {(myWon || theirWon || periodTie) && (() => {
                const winnerColor = myWon ? (myFilledColor ?? '#10B981') : '#9CA3AF'
                const accent = winnerColor + '35'
                const border = winnerColor + '70'
                const emoji = periodTie ? '🤝' : myWon && theirWon ? '🎉' : myWon ? '🏆' : '🥈'
                const headline = periodTie ? "It's a tie!" : myWon && theirWon ? 'Both won!' : myWon ? 'You won!' : `${theirFirstName} won`
                const myColor_ = myWon ? winnerColor : '#D1D5DB'
                const theirColor_ = theirWon ? winnerColor : '#D1D5DB'
                return (
                  <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
                    {/* Header */}
                    <div className="flex items-center gap-2 px-4 py-2.5" style={{ backgroundColor: accent }}>
                      <span className="text-base leading-none">{emoji}</span>
                      <p className="text-xs font-bold tracking-wide" style={{ color: winnerColor, filter: 'brightness(0.65)' }}>{headline}</p>
                    </div>
                    {/* Score */}
                    <div className="px-4 pt-4 pb-4" style={{ backgroundColor: accent }}>
                      <div className="flex items-center gap-3">
                        {/* You */}
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">You</p>
                          <p className="text-5xl font-black leading-none" style={{ color: myColor_ }}>{myDone}</p>
                        </div>
                        {/* Divider */}
                        <div className="flex flex-col items-center justify-center self-stretch gap-1 px-1">
                          <div className="flex-1 w-px bg-black/8" />
                          <span className="text-[10px] text-gray-300 font-medium">vs</span>
                          <div className="flex-1 w-px bg-black/8" />
                        </div>
                        {/* Them */}
                        <div className="flex-1 text-right">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5 capitalize">{theirFirstName}</p>
                          <p className="text-5xl font-black leading-none" style={{ color: theirColor_ }}>{theirDone}</p>
                        </div>
                      </div>
                    </div>
                    {/* Prize */}
                    {!!challenge.description && (
                      <div className="flex items-center gap-2 px-4 py-3 border-t border-black/8" style={{ backgroundColor: accent }}>
                        <span className="text-xs">🎁</span>
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Prize</p>
                          <p className="text-xs text-gray-600 font-semibold leading-tight">{challenge.description}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
              <MonthCalendar
                completedDates={myDates}
                color={myColor}
                minDate={(challenge.start_date ?? challenge.created_at).slice(0, 10)}
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
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setConfirmLeave(true)}
                    className="px-4 py-2.5 text-sm rounded-lg text-gray-500 hover:bg-black/8 transition-colors"
                  >
                    Leave
                  </button>
                  <button
                    type="button"
                    onClick={() => { dialogRef.current?.close(); setShowEdit(true) }}
                    className="px-4 py-2.5 text-sm rounded-lg text-gray-500 hover:bg-black/8 transition-colors"
                  >
                    Edit
                  </button>
                </div>
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
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span
            style={myColor ? { color: COLOR_VARIANTS[myColor]?.filled ?? myColor, filter: COLOR_VARIANTS[myColor] ? undefined : 'brightness(0.7)' } : undefined}
            className={`text-[14.7px] font-bold tracking-tight block truncate ${!myColor ? 'text-gray-700' : ''}`}
          >
            {challenge.my_habit.name}
          </span>
        </div>
        <div className="flex items-center shrink-0">
          {!myWon && !theirWon && !periodTie && leading === 'me' && <span className="text-[11px]" style={myColor ? { color: COLOR_VARIANTS[myColor]?.filled ?? myColor, filter: COLOR_VARIANTS[myColor] ? undefined : 'brightness(0.7)' } : { color: '#10B981' }}>You're ahead 😎</span>}
          {!myWon && !theirWon && !periodTie && leading === 'them' && <span className="text-[11px] capitalize" style={myColor ? { color: COLOR_VARIANTS[myColor]?.filled ?? myColor, filter: COLOR_VARIANTS[myColor] ? undefined : 'brightness(0.7)' } : { color: '#9CA3AF' }}>{theirFirstName} ahead</span>}
          {!myWon && !theirWon && !periodTie && leading === 'tie' && <span className="text-[11px]" style={myColor ? { color: COLOR_VARIANTS[myColor]?.filled ?? myColor, filter: COLOR_VARIANTS[myColor] ? undefined : 'brightness(0.7)' } : { color: '#9CA3AF' }}>Even</span>}
        </div>
      </div>

      {/* Winner / tie badge */}
      {(myWon || theirWon || periodTie) && (
        <div
          className="absolute top-3 right-3 flex items-center gap-1 rounded-full px-2 py-0.5"
          style={{ backgroundColor: (myFilledColor ?? '#10B981') + '28' }}
        >
          <span className="text-[11px] leading-none">{periodTie ? '🤝' : myWon && theirWon ? '🎉' : '🏆'}</span>
          <span
            className="text-[10px] font-semibold"
            style={myColor ? { color: COLOR_VARIANTS[myColor]?.filled ?? myColor, filter: COLOR_VARIANTS[myColor] ? undefined : 'brightness(0.7)' } : { color: '#10B981' }}
          >
            {periodTie ? 'Tie!' : myWon && theirWon ? 'Both won!' : myWon ? 'You won!' : `${theirFirstName} won!`}
          </span>
        </div>
      )}

      {/* Score + progress */}
      {(() => {
        const start = new Date(challenge.start_date ?? challenge.created_at)
        start.setHours(0, 0, 0, 0)
        const today = new Date(); today.setHours(0, 0, 0, 0)
        const goal = challenge.my_habit.goal
        const daysPassed = Math.min(goal, Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1))
        const timePct = Math.min(100, Math.round((daysPassed / goal) * 100))
        return (
          <div className="space-y-2">
            {/* Side-by-side scores */}
            <div className="flex items-stretch gap-3">
              <div className="flex-1">
                <p className="text-[11px] text-gray-500 mb-1 font-medium">You</p>
                <p className="text-3xl font-bold leading-none" style={{ color: myFilledColor ?? '#6B7280' }}>{challenge.my_habit.completed_days}</p>
              </div>
              <div className="flex flex-col items-center justify-center gap-1">
                <div className="flex-1 w-px bg-black/8" />
                <span className="text-[10px] text-gray-300 font-medium">vs</span>
                <div className="flex-1 w-px bg-black/8" />
              </div>
              <div className="flex-1 text-right">
                <p className="text-[11px] text-gray-500 mb-1 font-medium capitalize">{theirFirstName}</p>
                <p className="text-3xl font-bold leading-none text-gray-400">{challenge.their_habit.completed_days}</p>
              </div>
            </div>
            {/* Label + bar */}
            <div className="space-y-1">
              <p className="text-[11px] text-gray-400">
                {`${daysPassed}/${goal} days (${timePct}%)`}
              </p>
              <div className="h-2 rounded-full overflow-hidden bg-black/10">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${timePct}%`, backgroundColor: myFilledColor ?? '#9CA3AF' }} />
              </div>
            </div>
            <p className="text-[10px] text-gray-400">
              Since {new Date(challenge.start_date ?? challenge.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        )
      })()}

      {/* Heatmaps (when toggled) */}
      {showHeatmap && (
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400">You</p>
            {myDates ? <YearGrid completedDates={myDates} color={myColor} /> : <div className="h-10 rounded-lg bg-black/5 animate-pulse" />}
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400">{theirFirstName}</p>
            {theirDates ? <YearGrid completedDates={theirDates} color={myColor} /> : <div className="h-10 rounded-lg bg-black/5 animate-pulse" />}
          </div>
        </div>
      )}

      {/* Pending update banner */}
      {challenge.update_proposal && (
        <div className="rounded-xl px-3 py-2.5 space-y-2 bg-gray-100 border border-gray-200">
          {challenge.i_proposed_update ? (
            <p className="text-[11px] text-gray-500 font-medium">⏳ Waiting for your opponent to accept the changes</p>
          ) : (() => {
            const p = challenge.update_proposal!
            const curName = challenge.my_habit?.name ?? ''
            const curDesc = challenge.description ?? ''
            const curStart = (challenge.start_date ?? challenge.created_at).slice(0, 10)
            const curEnd = challenge.period_end ?? ''
            const fmt = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
            const accent = myColor ?? '#9CA3AF'
            const changed = (a: string, b: string) => a !== b

            function Field({ label, cur, next }: { label: string; cur: string; next: string }) {
              const isChanged = changed(cur, next)
              return (
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-gray-400 w-10 shrink-0 mt-0.5">{label}</span>
                  <div className="flex items-center gap-1 flex-wrap min-w-0">
                    {isChanged && cur && <span className="text-[11px] text-gray-300 line-through">{cur}</span>}
                    {isChanged && cur && <span className="text-[10px] text-gray-300">→</span>}
                    <span
                      className="text-[11px] font-medium"
                      style={isChanged ? { color: accent } : { color: '#6B7280' }}
                    >
                      {next || '—'}
                    </span>
                  </div>
                </div>
              )
            }

            return (
              <>
                <p className="text-[11px] font-semibold text-gray-700">Proposed changes</p>
                <div className="space-y-1.5 py-1">
                  <Field label="Name" cur={curName} next={p.name} />
                  <Field label="Prize" cur={curDesc} next={p.description ?? ''} />
                  <Field label="Start" cur={fmt(curStart)} next={fmt(p.startDate ?? curStart)} />
                  <Field label="End" cur={fmt(curEnd)} next={fmt(p.periodEnd)} />
                  <Field label="Days" cur={String(challenge.my_habit?.goal ?? '')} next={String(p.days)} />
                </div>
                <div className="flex gap-2 pt-0.5">
                  <button
                    type="button"
                    disabled={respondingUpdate}
                    onClick={async e => { e.stopPropagation(); setRespondingUpdate(true); try { await respondToUpdate(challenge.id, 'accept_update'); onAccepted(challenge.id) } finally { setRespondingUpdate(false) } }}
                    className="flex-1 py-2 text-xs rounded-xl text-white font-medium disabled:opacity-40"
                    style={{ backgroundColor: accent }}
                  >
                    Accept changes
                  </button>
                  <button
                    type="button"
                    disabled={respondingUpdate}
                    onClick={async e => { e.stopPropagation(); setRespondingUpdate(true); try { await respondToUpdate(challenge.id, 'decline_update'); onAccepted(challenge.id) } finally { setRespondingUpdate(false) } }}
                    className="flex-1 py-2 text-xs rounded-xl disabled:opacity-40 text-gray-500"
                    style={{ border: `1px solid ${accent}44` }}
                  >
                    Decline
                  </button>
                </div>
              </>
            )
          })()}
        </div>
      )}

      {showEdit && (
        <EditChallengeModal
          challenge={challenge}
          onClose={() => setShowEdit(false)}
          onSent={() => { setShowEdit(false); onAccepted(challenge.id) }}
        />
      )}
    </li>
  )
}
