'use client'

import { useEffect, useRef, useState } from 'react'
import { toggleCompletion } from '@/lib/api'
import type { Habit, Completion } from '@/lib/types'

function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Props {
  habits: Habit[]
  completions: Completion[]
  onToggle: (habitId: number, date: string, added: boolean) => void
  onClose: () => void
  onCompleted?: () => void
}

export default function DailySwipe({ habits, completions, onToggle, onClose, onCompleted }: Props) {
  const today = toLocalDate(new Date())
  const dialogRef = useRef<HTMLDialogElement>(null)

  const [queue] = useState(() =>
    habits.filter(h =>
      h.completed_days < h.goal &&
      !completions.some(c => c.habit_id === h.id && c.date === today)
    )
  )

  const [index, setIndex] = useState(0)
  const [drag, setDrag] = useState(0)
  const [flyDir, setFlyDir] = useState<'left' | 'right' | null>(null)
  const [animating, setAnimating] = useState(false)
  const startX = useRef(0)
  const isDragging = useRef(false)

  useEffect(() => { dialogRef.current?.showModal() }, [])

  const current = queue[index]
  const next = queue[index + 1]
  const allDone = index >= queue.length

  function advance(dir: 'left' | 'right') {
    if (animating) return
    setFlyDir(dir)
    setAnimating(true)
    if (dir === 'right' && current) {
      toggleCompletion(current.id, today).then(() => onToggle(current.id, today, true))
    }
    setTimeout(() => {
      const nextIndex = index + 1
      setIndex(nextIndex)
      setDrag(0)
      setFlyDir(null)
      setAnimating(false)
      if (nextIndex >= queue.length) onCompleted?.()
    }, 300)
  }

  function onPointerDown(e: React.PointerEvent) {
    if (animating) return
    isDragging.current = true
    startX.current = e.clientX
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging.current) return
    setDrag(e.clientX - startX.current)
  }

  function onPointerUp() {
    if (!isDragging.current) return
    isDragging.current = false
    if (Math.abs(drag) > 80) advance(drag > 0 ? 'right' : 'left')
    else setDrag(0)
  }

  const rotation = drag * 0.06
  const greenOpacity = Math.max(0, Math.min(drag / 100, 1))
  const redOpacity = Math.max(0, Math.min(-drag / 100, 1))
  const xOffset = flyDir === 'right' ? 800 : flyDir === 'left' ? -800 : drag
  const rot = flyDir === 'right' ? 30 : flyDir === 'left' ? -30 : rotation
  const pct = current ? Math.min(Math.round((current.completed_days / current.goal) * 100), 100) : 0

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={e => { if (e.target === dialogRef.current) onClose() }}
      className="fixed inset-0 m-auto border-0 p-0 bg-transparent backdrop:bg-black/60 w-[calc(100%-2rem)] max-w-sm"
      style={{ borderRadius: 28 }}
    >
      {allDone || queue.length === 0 ? (
        <div className="bg-white rounded-[28px] flex flex-col items-center justify-center gap-4 py-16 px-6">
          <span className="text-5xl">🎉</span>
          <p className="text-lg font-semibold text-gray-900">All done for today!</p>
          <p className="text-sm text-gray-400 text-center">
            {queue.length === 0 ? 'All habits already completed.' : 'You tracked all your habits.'}
          </p>
          <button
            onClick={onClose}
            className="mt-2 px-8 py-2.5 rounded-full bg-gray-900 text-white text-sm font-medium active:scale-95 transition-all"
          >
            Close
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Card stack area */}
          <div className="relative" style={{ height: 380 }}>

            {/* Next card — just its top edge peeking */}
            {next && (
              <div
                className="absolute inset-x-0 bottom-0 rounded-[24px] overflow-hidden"
                style={{
                  height: 360,
                  background: next.color ?? '#E5E7EB',
                  transform: 'scale(0.94) translateY(12px)',
                  opacity: 0.6,
                }}
              />
            )}

            {/* Current card — draggable */}
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className="absolute inset-0 rounded-[24px] overflow-hidden select-none"
              style={{
                transform: `translateX(${xOffset}px) rotate(${rot}deg)`,
                transition: animating ? 'transform 0.3s cubic-bezier(0.4,0,0.2,1)' : 'none',
                touchAction: 'none',
                cursor: 'grab',
                background: current.color ?? '#E5E7EB',
              }}
            >
              {/* Close + counter — on top of the card */}
              <div className="absolute top-0 inset-x-0 flex items-center justify-between px-5 pt-5 z-10">
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); onClose() }}
                  className="w-8 h-8 rounded-full bg-black/15 flex items-center justify-center text-white/80 hover:bg-black/25 transition-colors focus:outline-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
                <div className="flex gap-1.5 items-center">
                  {queue.map((_, i) => (
                    <div
                      key={i}
                      className="rounded-full transition-all duration-300"
                      style={{
                        height: 4,
                        width: i === index ? 20 : 6,
                        backgroundColor: i <= index ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium text-white/70">{index + 1}/{queue.length}</span>
              </div>

              {/* DONE stamp */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ opacity: greenOpacity }}
              >
                <span
                  className="text-4xl font-black text-green-400 border-4 border-green-400 rounded-2xl px-5 py-1.5 bg-white/20"
                  style={{ transform: 'rotate(-12deg)' }}
                >
                  DONE
                </span>
              </div>

              {/* SKIP stamp */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ opacity: redOpacity }}
              >
                <span
                  className="text-4xl font-black text-red-400 border-4 border-red-400 rounded-2xl px-5 py-1.5 bg-white/20"
                  style={{ transform: 'rotate(12deg)' }}
                >
                  SKIP
                </span>
              </div>

              {/* Habit content */}
              <div className="absolute inset-0 flex flex-col justify-center items-center px-6 pb-16 gap-3" style={{ paddingTop: '30%' }}>
                <p className="text-5xl font-bold text-white text-center" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
                  {current.name}
                </p>
                <p className="text-sm font-semibold text-white/80 tracking-wide">Done today?</p>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-white/75">
                    <span>{current.completed_days} / {current.goal} days</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/30">
                    <div
                      className="h-full rounded-full bg-white transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-center gap-5">
            <button
              onClick={() => advance('left')}
              className="w-14 h-14 rounded-full bg-white text-gray-400 hover:text-red-400 flex items-center justify-center transition-all active:scale-90 focus:outline-none shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <button
              onClick={() => advance('right')}
              className="w-16 h-16 rounded-full bg-white text-gray-900 hover:text-green-600 flex items-center justify-center transition-all active:scale-90 focus:outline-none shadow-xl"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}
