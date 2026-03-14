'use client'

import { useEffect, useState } from 'react'
import { fetchInit, fetchCompletions, deleteHabit, toggleCompletion } from '@/lib/api'
import type { Habit, Completion } from '@/lib/types'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import HabitList from '@/components/HabitList'
import AddHabitModal from '@/components/AddHabitModal'
import EditHabitModal from '@/components/EditHabitModal'
import LoginModal from '@/components/LoginModal'

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
  const [user, setUser] = useState<User | null>(null)
  const [habits, setHabits] = useState<Habit[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) { setHabits([]); setCompletions([]); setLoading(false); return }
    setLoading(true)
    fetchInit()
      .then(({ habits, completions }) => { setHabits(habits); setCompletions(completions) })
      .catch(() => setError('Could not load habits.'))
      .finally(() => setLoading(false))
  }, [user])

  function handleAddGoalClick() {
    if (user) setShowAddModal(true)
    else setShowLoginModal(true)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        {!loading && !habits.length && (
          <p className="text-sm text-gray-400">No habits yet.</p>
        )}
        <div className="ml-auto">
          <button
            onClick={handleAddGoalClick}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add goal
          </button>
        </div>
      </div>

      <HabitList
        habits={habits}
        completions={completions}
        loading={loading}
        error={error}
        onEdit={setEditingHabit}
        onToggleDay={(habit_id, date) => {
          // Optimistic update — instant UI response
          const alreadyDone = completions.some(c => c.habit_id === habit_id && c.date === date)
          setCompletions(prev =>
            alreadyDone
              ? prev.filter(c => !(c.habit_id === habit_id && c.date === date))
              : [...prev, { id: -1, habit_id, date }]
          )
          setHabits(prev => prev.map(h =>
            h.id === habit_id
              ? { ...h, completed_days: h.completed_days + (alreadyDone ? -1 : 1) }
              : h
          ))
          // Sync with server in background
          toggleCompletion(habit_id, date).then(({ habit }) => {
            setHabits(prev => prev.map(h => h.id === habit_id ? habit : h))
          })
        }}
      />

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLoggedIn={() => { setShowLoginModal(false); setShowAddModal(true) }}
        />
      )}

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
          onDeleted={id => {
            setHabits(prev => prev.filter(h => h.id !== id))
            setEditingHabit(null)
          }}
        />
      )}
    </>
  )
}
