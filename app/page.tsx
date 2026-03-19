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

function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekBounds(): { from: string; to: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const from = new Date(today)
  from.setDate(today.getDate() - 6)
  return {
    from: toLocalDate(from),
    to: toLocalDate(today),
  }
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [habits, setHabits] = useState<Habit[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [yearCompletions, setYearCompletions] = useState<Completion[]>([])
  const [yearCompletionsLoaded, setYearCompletionsLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'heatmap'>('cards')
  const [filter, setFilter] = useState<'all' | 'done' | 'pending'>('all')

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

  function handleToggleView() {
    const next = viewMode === 'cards' ? 'heatmap' : 'cards'
    if (next === 'heatmap' && !yearCompletionsLoaded && habits.length > 0) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const from = new Date(today)
      from.setDate(today.getDate() - 365)
      fetchCompletions(toLocalDate(from), toLocalDate(today))
        .then(data => { setYearCompletions(data); setYearCompletionsLoaded(true) })
    }
    setViewMode(next)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        {/* Filter pills */}
        {habits.length > 0 ? (
          <div className="flex gap-1 bg-gray-200 rounded-full p-1">
            {(['all', 'pending', 'done'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3.5 py-1.5 rounded-full transition-all focus:outline-none font-medium ${
                  filter === f
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f === 'all' ? 'All' : f === 'done' ? 'Done' : 'Active'}
              </button>
            ))}
          </div>
        ) : (
          !loading && <p className="text-sm text-gray-400">No habits yet.</p>
        )}

        <div className="flex items-center gap-2">
          {habits.length > 0 && (
            <button
              onClick={handleToggleView}
              title={viewMode === 'cards' ? 'Year view' : 'Week view'}
              className={`w-8 h-8 flex items-center justify-center transition-all focus:outline-none ${
                viewMode === 'heatmap' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {viewMode === 'cards' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                  <circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="3" cy="18" r="1" fill="currentColor"/>
                </svg>
              )}
            </button>
          )}
          <button
            onClick={handleAddGoalClick}
            className="flex items-center gap-1.5 text-xs px-3.5 py-2.5 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 active:scale-95 transition-all focus:outline-none font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Goal</span>
          </button>
        </div>
      </div>

      <HabitList
        habits={habits.filter(h =>
          filter === 'all' ? true : filter === 'done' ? h.completed_days >= h.goal : h.completed_days < h.goal
        )}
        completions={completions}
        yearCompletions={yearCompletions}
        loading={loading}
        error={error}
        viewMode={viewMode}
        onEdit={setEditingHabit}
        onToggleDay={(habit_id, date) => {
          // Optimistic update — instant UI response
          const alreadyDone = completions.some(c => c.habit_id === habit_id && c.date === date)
          setCompletions(prev =>
            alreadyDone
              ? prev.filter(c => !(c.habit_id === habit_id && c.date === date))
              : [...prev, { id: -1, habit_id, date }]
          )
          if (yearCompletionsLoaded) {
            setYearCompletions(prev =>
              alreadyDone
                ? prev.filter(c => !(c.habit_id === habit_id && c.date === date))
                : [...prev, { id: -1, habit_id, date }]
            )
          }
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
          onDayToggled={(updated, date, added) => {
            setHabits(prev => prev.map(h => h.id === updated.id ? updated : h))
            if (yearCompletionsLoaded) {
              setYearCompletions(prev =>
                added
                  ? [...prev, { id: -1, habit_id: updated.id, date }]
                  : prev.filter(c => !(c.habit_id === updated.id && c.date === date))
              )
            }
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
