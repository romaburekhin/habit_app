'use client'

import { useEffect, useState } from 'react'

function todayKey() {
  const d = new Date()
  return `track-done-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export default function TrackDayButton() {
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDone(!!localStorage.getItem(todayKey()))
    function onComplete() {
      localStorage.setItem(todayKey(), '1')
      setDone(true)
    }
    window.addEventListener('track-day-complete', onComplete)
    return () => window.removeEventListener('track-day-complete', onComplete)
  }, [])

  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent('track-day'))}
      title="Track your day"
      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all focus:outline-none"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    </button>
  )
}
