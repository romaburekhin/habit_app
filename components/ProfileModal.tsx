'use client'

import { useEffect, useRef, useState } from 'react'

interface Stats {
  habitsCount: number
  goalsReached: number
  mostAmbitious: string | null
  maxStreak: number
  memberSince: string | null
}

interface Props {
  initials: string
  onClose: () => void
}

export default function ProfileModal({ initials, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
    fetch('/api/stats').then(r => r.json()).then(setStats)
  }, [])

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={e => { if (e.target === dialogRef.current) onClose() }}
      className="fixed inset-0 m-auto rounded-2xl border-0 p-0 shadow-2xl backdrop:bg-black/50 w-[calc(100%-2rem)] max-w-xs overflow-hidden"
    >
      {/* Header */}
      <div className="relative bg-gray-900 px-6 py-10 text-center">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-all text-sm focus:outline-none"
        >
          ✕
        </button>
        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
          <span className="text-3xl font-bold text-white">{initials || '?'}</span>
        </div>
        {stats?.memberSince
          ? <p className="text-xs text-gray-500 font-medium">Since {stats.memberSince}</p>
          : <p className="text-xs text-gray-700 font-medium">—</p>
        }
      </div>

      {/* Stats — top row */}
      <div className="grid grid-cols-2 bg-white">
        <div className="px-5 py-5 text-center border-b border-r border-gray-100">
          <p className="text-3xl font-bold text-blue-500/60 tabular-nums">
            {stats?.habitsCount ?? <span className="text-gray-300">—</span>}
          </p>
          <p className="text-[11px] text-gray-400 mt-1 font-medium uppercase tracking-wide">Goals</p>
        </div>
        <div className="px-5 py-5 text-center border-b border-gray-100">
          <p className="text-3xl font-bold text-emerald-500/60 tabular-nums">
            {stats?.goalsReached ?? <span className="text-gray-300">—</span>}
          </p>
          <p className="text-[11px] text-gray-400 mt-1 font-medium uppercase tracking-wide">Goals reached</p>
        </div>

        {/* Bottom row */}
        <div className="px-5 py-5 text-center border-r border-gray-100">
          <p className="text-3xl font-bold text-pink-500/60 tabular-nums">
            {stats?.maxStreak ?? <span className="text-gray-300">—</span>}
          </p>
          <p className="text-[11px] text-gray-400 mt-1 font-medium uppercase tracking-wide">Max days in a row</p>
        </div>
        <div className="px-5 py-5 text-center">
          <p
            className="text-sm font-semibold text-gray-900 leading-tight truncate px-1"
            title={stats?.mostAmbitious ?? undefined}
          >
            {stats
              ? (stats.mostAmbitious ?? <span className="text-gray-300 font-normal text-xs">—</span>)
              : <span className="text-gray-300">—</span>
            }
          </p>
          <p className="text-[11px] text-gray-400 mt-1 font-medium uppercase tracking-wide">Most ambitious goal</p>
        </div>
      </div>
    </dialog>
  )
}
