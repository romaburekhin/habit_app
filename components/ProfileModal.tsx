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
      className="fixed inset-0 m-auto rounded-2xl border-0 p-0 shadow-xl backdrop:bg-black/40 w-[calc(100%-2rem)] max-w-xs bg-white overflow-hidden"
    >
      {/* Header */}
      <div className="relative px-6 pt-8 pb-5 text-center">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all text-xs focus:outline-none"
        >
          ✕
        </button>
        <div className="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center mx-auto mb-3">
          <span className="text-base font-semibold text-white">{initials || '?'}</span>
        </div>
        {stats?.memberSince
          ? <p className="text-xs text-gray-400">Member since {stats.memberSince}</p>
          : <p className="text-xs text-gray-300">—</p>
        }
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-gray-100" />

      {/* Stats */}
      <div className="px-4 pt-4 pb-5 grid grid-cols-2 gap-2">
        <div className="bg-gray-100 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-blue-500 tabular-nums">
            {stats?.habitsCount ?? '—'}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5 font-medium uppercase tracking-wide">Goals</p>
        </div>
        <div className="bg-gray-100 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-emerald-500 tabular-nums">
            {stats?.goalsReached ?? '—'}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5 font-medium uppercase tracking-wide">Reached</p>
        </div>
        <div className="bg-gray-100 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-pink-500 tabular-nums">
            {stats?.maxStreak ?? '—'}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5 font-medium uppercase tracking-wide">Best streak</p>
        </div>
        <div className="bg-gray-100 rounded-xl px-4 py-3 text-center flex flex-col justify-center">
          <p className="text-sm font-semibold text-gray-800 leading-tight truncate" title={stats?.mostAmbitious ?? undefined}>
            {stats ? (stats.mostAmbitious ?? <span className="text-gray-300 font-normal text-xs">—</span>) : '—'}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5 font-medium uppercase tracking-wide">Top goal</p>
        </div>
      </div>
    </dialog>
  )
}
