'use client'
// src/components/shared/AnnouncementBanner.tsx

import { useState } from 'react'
import { X } from 'lucide-react'

interface AnnouncementBannerProps {
  text: string
}

export function AnnouncementBanner({ text }: AnnouncementBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed || !text) return null

  return (
    <div className="relative bg-brand-green">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 pr-12 flex items-center justify-center gap-2.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-purple/60">
          Announcement
        </span>
        <span className="w-px h-3 bg-brand-purple/20" />
        <p className="text-[13px] font-semibold text-brand-purple leading-snug text-center">
          {text}
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-md hover:bg-brand-purple/10 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5 text-brand-purple/60" />
      </button>
    </div>
  )
}