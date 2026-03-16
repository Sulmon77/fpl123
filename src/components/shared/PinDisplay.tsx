'use client'
// src/components/shared/PinDisplay.tsx

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PinDisplayProps {
  pin: string
  className?: string
}

export function PinDisplay({ pin, className }: PinDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pin)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement('input')
      el.value = pin
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className="relative">
        <div className="pin-display animate-pulse-green">
          {pin.split('').map((digit, i) => (
            <span key={i} className="inline-block w-10 text-center">
              {digit}
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={handleCopy}
        className={cn(
          'flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-all',
          copied
            ? 'bg-success/10 text-success border border-success/20'
            : 'bg-gray-100 text-text-secondary hover:bg-gray-200 border border-transparent'
        )}
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            Copy PIN
          </>
        )}
      </button>
    </div>
  )
}
