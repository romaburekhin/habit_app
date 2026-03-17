'use client'

import { useState } from 'react'
import ProfileModal from './ProfileModal'

export default function ProfileButton({ initials }: { initials: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-9 h-9 rounded-full bg-gray-900 text-white text-xs font-semibold transition-all focus:outline-none flex items-center justify-center"
      >
        {initials}
      </button>
      {open && <ProfileModal initials={initials} onClose={() => setOpen(false)} />}
    </>
  )
}
