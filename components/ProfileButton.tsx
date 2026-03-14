'use client'

import { useState } from 'react'
import ProfileModal from './ProfileModal'

export default function ProfileButton({ initials }: { initials: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors focus:outline-none"
      >
        <span className="text-[11px] font-semibold text-white">{initials}</span>
      </button>
      {open && <ProfileModal initials={initials} onClose={() => setOpen(false)} />}
    </>
  )
}
