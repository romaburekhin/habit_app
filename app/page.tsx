'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchInit, fetchCompletions, toggleCompletion, fetchChallenges, reorderHabits } from '@/lib/api'
import type { Habit, Completion, ChallengeView } from '@/lib/types'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import HabitList from '@/components/HabitList'
import AddHabitModal from '@/components/AddHabitModal'
import EditHabitModal from '@/components/EditHabitModal'
import LoginModal from '@/components/LoginModal'
import CommonGoalModal from '@/components/CommonGoalModal'
import ChallengeCard from '@/components/ChallengeCard'
import DailySwipe from '@/components/DailySwipe'

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
  const [authReady, setAuthReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showCommonModal, setShowCommonModal] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'heatmap'>('cards')
  const [filter, setFilter] = useState<'all' | 'active' | 'done' | 'common'>('active')
  const [challenges, setChallenges] = useState<ChallengeView[]>([])
  const [showSwipe, setShowSwipe] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([])
  const touchStartY = useRef(0)
  const pulling = useRef(false)
  const prevChallenges = useRef<ChallengeView[]>([])
  const autoOpened = useRef(false)

  const addToast = useCallback((msg: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }, [])

  const refresh = useCallback(async () => {
    if (!user) return
    setRefreshing(true)
    try {
      const [{ habits, completions }, newChallenges] = await Promise.all([fetchInit(), fetchChallenges()])
      const prev = prevChallenges.current
      for (const ch of prev) {
        if (ch.status === 'accepted' && !newChallenges.find(c => c.id === ch.id)) {
          const name = ch.their_name?.split(' ')[0] ?? ch.their_email
          const habitName = ch.my_habit?.name ?? 'shared goal'
          addToast(`${name} left "${habitName}"`)
        }
      }
      prevChallenges.current = newChallenges
      setHabits(habits)
      setCompletions(completions)
      try { localStorage.setItem(`habit-cache-${user.id}`, JSON.stringify({ habits, completions })) } catch {}
      setChallenges(newChallenges)
      setYearCompletionsLoaded(false)
    } catch {
      setError('Could not load habits.')
    } finally {
      setRefreshing(false)
    }
  }, [user, addToast])

  useEffect(() => {
    const supabase = createClient()
    // getSession reads from localStorage — no network call, instant on mobile
    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user ?? null
      setUser(sessionUser)
      if (sessionUser) {
        // Load cached data immediately so circles are filled on first render
        try {
          const cached = localStorage.getItem(`habit-cache-${sessionUser.id}`)
          if (cached) {
            const { habits, completions } = JSON.parse(cached)
            setHabits(habits)
            setCompletions(completions)
          } else {
            setLoading(true)
          }
        } catch {
          setLoading(true)
        }
      }
      setAuthReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      setAuthReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) { setHabits([]); setCompletions([]); setLoading(false); return }
    fetchInit()
      .then(({ habits, completions }) => {
        setHabits(habits)
        setCompletions(completions)
        try { localStorage.setItem(`habit-cache-${user.id}`, JSON.stringify({ habits, completions })) } catch {}
        if (!autoOpened.current) {
          autoOpened.current = true
          const today = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`
          const hasPending = habits.some(h =>
            h.completed_days < h.goal &&
            !completions.some(c => c.habit_id === h.id && c.date === today)
          )
          if (hasPending && localStorage.getItem('swipe-mode-enabled') !== 'false') setShowSwipe(true)
        }
      })
      .catch(() => setError('Could not load habits.'))
      .finally(() => setLoading(false))
    fetchChallenges().then(data => { setChallenges(data); prevChallenges.current = data }).catch(() => {})
  }, [user])

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [refresh])

  useEffect(() => {
    function onTrackDay() { setShowSwipe(true) }
    window.addEventListener('track-day', onTrackDay)
    return () => window.removeEventListener('track-day', onTrackDay)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('track') === '1') {
      setShowSwipe(true)
      window.history.replaceState({}, '', '/')
    }
  }, [])

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY !== 0) { pulling.current = false; return }
      touchStartY.current = e.touches[0].clientY
      pulling.current = true
    }
    function onTouchEnd(e: TouchEvent) {
      if (!pulling.current) return
      pulling.current = false
      const delta = e.changedTouches[0].clientY - touchStartY.current
      if (delta > 70) refresh()
    }
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [refresh])

  function handleAddGoalClick() {
    if (user) setShowAddModal(true)
    else setShowLoginModal(true)
  }

  function handleCommonGoalClick() {
    if (user) setShowCommonModal(true)
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

  const filteredHabits = habits.filter(h =>
    filter === 'active' ? h.completed_days < h.goal :
    filter === 'done' ? h.completed_days >= h.goal : true
  )

  const sharedHabitIds = new Map(
    challenges.filter(c => c.status === 'accepted' && c.my_habit).map(c => [c.my_habit!.id, c.their_name ?? c.their_email])
  )

  return (
    <>
      {refreshing && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Refreshing...
        </div>
      )}
      {toasts.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center">
          {toasts.map(({ id, msg }) => (
            <div key={id} className="bg-gray-900 text-white text-xs px-4 py-2.5 rounded-2xl shadow-lg flex items-center gap-2 max-w-[280px]">
              <span className="text-base leading-none">👋</span>
              <span>{msg}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 mb-5">
        {/* Filters */}
        {habits.length > 0 || challenges.length > 0 ? (
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5 bg-gray-200 rounded-full p-0.5">
              {(['active', 'done', 'all'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-3 py-1 rounded-full transition-all focus:outline-none font-medium ${
                    filter === f ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Done'}
                </button>
              ))}
              {challenges.length > 0 && (
                <button
                  onClick={() => setFilter('common')}
                  className={`text-xs px-3 py-1 rounded-full transition-all focus:outline-none font-medium ${
                    filter === 'common' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Shared
                </button>
              )}
            </div>
          </div>
        ) : (
          <div />
        )}

        {/* Icon actions */}
        <div className="flex items-center gap-1 shrink-0">
          {(habits.length > 0 || challenges.some(c => c.status === 'accepted')) && (
            <button
              onClick={handleToggleView}
              title={viewMode === 'cards' ? 'Year view' : 'Week view'}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all focus:outline-none ${viewMode === 'heatmap' ? 'text-gray-900 bg-gray-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
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
          {habits.length > 0 && user && (
            <button
              onClick={handleCommonGoalClick}
              title="New shared goal"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            </button>
          )}
{user && (
            <button
              onClick={handleAddGoalClick}
              title="New goal"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-900 text-white hover:bg-gray-800 active:scale-95 transition-all focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Challenge cards */}
      {filter === 'common' && (
        <ul className="space-y-3">
          {challenges.map(c => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              showHeatmap={viewMode === 'heatmap'}
              onAccepted={() => {
                fetchChallenges().then(data => { setChallenges(data); fetchInit().then(({ habits }) => setHabits(habits)) })
              }}
              onDeclined={id => setChallenges(prev => prev.filter(ch => ch.id !== id))}
              onDeleted={id => {
                setChallenges(prev => prev.filter(ch => ch.id !== id))
                fetchInit().then(({ habits }) => setHabits(habits))
              }}
              onColorChanged={(challengeId, color) => {
                setChallenges(prev => prev.map(ch =>
                  ch.id === challengeId && ch.my_habit
                    ? { ...ch, my_habit: { ...ch.my_habit, color } }
                    : ch
                ))
                setHabits(prev => {
                  const ch = challenges.find(c => c.id === challengeId)
                  return prev.map(h => ch?.my_habit?.id === h.id ? { ...h, color } : h)
                })
              }}
              onToggleDay={(habit_id, date) => {
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
                setChallenges(prev => prev.map(ch =>
                  ch.my_habit?.id === habit_id
                    ? { ...ch, my_habit: { ...ch.my_habit!, completed_days: ch.my_habit!.completed_days + (alreadyDone ? -1 : 1) } }
                    : ch
                ))
                toggleCompletion(habit_id, date).then(({ habit }) => {
                  setHabits(prev => prev.map(h => h.id === habit_id ? habit : h))
                  setChallenges(prev => prev.map(ch =>
                    ch.my_habit?.id === habit_id
                      ? { ...ch, my_habit: { ...ch.my_habit!, completed_days: habit.completed_days } }
                      : ch
                  ))
                })
              }}
            />
          ))}
        </ul>
      )}

      {/* Loading state — auth resolving or habits fetching */}
      {(!authReady || loading) && habits.length === 0 && (
        <div className="flex items-center justify-center pt-24">
          <span className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {authReady && !loading && habits.length === 0 && filter !== 'common' && (
        <div className="flex flex-col items-center justify-center pt-20 gap-5">
          <button
            onClick={handleAddGoalClick}
            className="w-20 h-20 rounded-full bg-gray-900 text-white flex items-center justify-center active:scale-95 transition-all shadow-xl hover:bg-gray-800 focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <div className="text-center">
            <p className="text-base font-medium text-gray-800">Start tracking habits</p>
            <p className="text-sm text-gray-400 mt-1">Tap to add your first goal</p>
          </div>
        </div>
      )}

      {/* Regular habits */}
      {!loading && filter !== 'common' && habits.length > 0 && (
        <HabitList
          habits={filteredHabits}
          completions={completions}
          yearCompletions={yearCompletions}
          loading={loading}
          error={error}
          viewMode={viewMode}
          sharedHabitIds={sharedHabitIds}
          onEdit={setEditingHabit}
          onReorder={reordered => {
            setHabits(reordered)
            reorderHabits(reordered.map(h => h.id)).catch(() => {})
          }}
          onToggleDay={(habit_id, date) => {
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
            setChallenges(prev => prev.map(ch =>
              ch.my_habit?.id === habit_id
                ? { ...ch, my_habit: { ...ch.my_habit!, completed_days: ch.my_habit!.completed_days + (alreadyDone ? -1 : 1) } }
                : ch
            ))
            toggleCompletion(habit_id, date).then(({ habit }) => {
              setHabits(prev => prev.map(h => h.id === habit_id ? habit : h))
              setChallenges(prev => prev.map(ch =>
                ch.my_habit?.id === habit_id
                  ? { ...ch, my_habit: { ...ch.my_habit!, completed_days: habit.completed_days } }
                  : ch
              ))
            })
          }}
        />
      )}

      {showSwipe && (
        <DailySwipe
          habits={habits}
          completions={completions}
          onToggle={(habitId, date, added) => {
            setCompletions(prev =>
              added
                ? [...prev, { id: -1, habit_id: habitId, date }]
                : prev.filter(c => !(c.habit_id === habitId && c.date === date))
            )
            setHabits(prev => prev.map(h =>
              h.id === habitId ? { ...h, completed_days: h.completed_days + (added ? 1 : -1) } : h
            ))
          }}
          onCompleted={() => window.dispatchEvent(new CustomEvent('track-day-complete'))}
          onClose={() => setShowSwipe(false)}
        />
      )}

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

      {showCommonModal && (
        <CommonGoalModal
          habits={habits}
          sharedHabitIds={sharedHabitIds}
          onClose={() => setShowCommonModal(false)}
          onSent={() => fetchChallenges().then(setChallenges)}
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
            setChallenges(prev => prev.map(ch =>
              ch.my_habit?.id === updated.id
                ? { ...ch, my_habit: { ...ch.my_habit!, color: updated.color, name: updated.name, goal: updated.goal } }
                : ch
            ))
            setEditingHabit(null)
          }}
          onDayToggled={(updated, date, added) => {
            setHabits(prev => prev.map(h => h.id === updated.id ? updated : h))
            setChallenges(prev => prev.map(ch =>
              ch.my_habit?.id === updated.id
                ? { ...ch, my_habit: { ...ch.my_habit!, completed_days: updated.completed_days } }
                : ch
            ))
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
