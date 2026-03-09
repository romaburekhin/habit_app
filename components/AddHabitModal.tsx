'use client'

import { useEffect, useRef, useState } from 'react'
import { createHabit } from '@/lib/api'
import type { Habit } from '@/lib/types'

interface Props {
  onClose: () => void
  onCreated: (habit: Habit) => void
}

export default function AddHabitModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [goal, setGoal] = useState(10)
  const [submitting, setSubmitting] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      const habit = await createHabit(name, goal)
      onCreated(habit)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 p-0 shadow-xl backdrop:bg-black/40 w-full max-w-sm"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <h2 className="text-base font-semibold">New habit</h2>

        <div className="space-y-1">
          <label className="text-xs text-gray-500">Name</label>
          <input
            autoFocus
            type="text"
            placeholder="e.g. Read 30 min"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-500">Goal (days)</label>
          <input
            type="number"
            min={1}
            max={365}
            value={goal}
            onChange={e => setGoal(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || goal < 1 || submitting}
            className="px-4 py-2 text-sm rounded-lg bg-gray-900 text-white disabled:opacity-50"
          >
            {submitting ? 'Adding...' : 'Add'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
