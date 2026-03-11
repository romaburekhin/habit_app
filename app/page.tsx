'use client'

import { useEffect, useState } from 'react'
import { fetchHabits, fetchCompletions, deleteHabit, toggleCompletion } from '@/lib/api'
import type { Habit, Completion } from '@/lib/types'
import HabitList from '@/components/HabitList'
import AddHabitModal from '@/components/AddHabitModal'
import EditHabitModal from '@/components/EditHabitModal'

function getWeekBounds(): { from: string; to: string } {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    from: monday.toISOString().slice(0, 10),
    to: sunday.toISOString().slice(0, 10),
  }
}

export default function Home() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)

  useEffect(() => {
    const { from, to } = getWeekBounds()
    Promise.all([fetchHabits(), fetchCompletions(from, to)])
      .then(([h, c]) => {
        setHabits(h)
        setCompletions(c)
      })
      .catch(() => setError('Could not load habits.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-medium text-gray-500">Goals</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add goal
        </button>
      </div>

      <HabitList
        habits={habits}
        completions={completions}
        loading={loading}
        error={error}
        onEdit={setEditingHabit}
        onDelete={async id => {
          await deleteHabit(id)
          setHabits(prev => prev.filter(h => h.id !== id))
          setCompletions(prev => prev.filter(c => c.habit_id !== id))
        }}
        onToggleDay={async (habit_id, date) => {
          const { created, completion, habit } = await toggleCompletion(habit_id, date)
          setHabits(prev => prev.map(h => h.id === habit_id ? habit : h))
          setCompletions(prev => {
            if (created && completion) return [...prev, completion]
            return prev.filter(c => !(c.habit_id === habit_id && c.date === date))
          })
        }}
      />

      {showAddModal && (
        <AddHabitModal
          onClose={() => setShowAddModal(false)}
          onCreated={habit => setHabits(prev => [...prev, habit])}
        />
      )}

      {editingHabit && (
        <EditHabitModal
          habit={editingHabit}
          onClose={() => {
            setEditingHabit(null)
            const { from, to } = getWeekBounds()
            fetchCompletions(from, to).then(setCompletions)
          }}
          onUpdated={updated => {
            setHabits(prev => prev.map(h => h.id === updated.id ? updated : h))
            setEditingHabit(null)
          }}
          onDayToggled={updated => {
            setHabits(prev => prev.map(h => h.id === updated.id ? updated : h))
          }}
        />
      )}
    </>
  )
}
