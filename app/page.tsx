'use client'

import { useEffect, useState } from 'react'
import { fetchHabits, deleteHabit, incrementHabitDays } from '@/lib/api'
import type { Habit } from '@/lib/types'
import HabitList from '@/components/HabitList'
import AddHabitModal from '@/components/AddHabitModal'
import EditHabitModal from '@/components/EditHabitModal'

export default function Home() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)

  useEffect(() => {
    fetchHabits()
      .then(setHabits)
      .catch(() => setError('Could not load habits.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-medium text-gray-500">Your habits</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="text-sm px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-700"
        >
          + Add habit
        </button>
      </div>

      <HabitList
        habits={habits}
        loading={loading}
        error={error}
        onEdit={setEditingHabit}
        onDelete={async id => {
          await deleteHabit(id)
          setHabits(prev => prev.filter(h => h.id !== id))
        }}
        onToggleToday={async id => {
          const updated = await incrementHabitDays(id)
          setHabits(prev => prev.map(h => h.id === id ? updated : h))
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
          onClose={() => setEditingHabit(null)}
          onUpdated={updated => {
            setHabits(prev => prev.map(h => h.id === updated.id ? updated : h))
            setEditingHabit(null)
          }}
        />
      )}
    </>
  )
}
