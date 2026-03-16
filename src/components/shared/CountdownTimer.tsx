'use client'
// src/components/shared/CountdownTimer.tsx

import { useState, useEffect } from 'react'
import { getTimeRemaining } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface CountdownTimerProps {
  deadline: string
  onExpire?: () => void
  compact?: boolean
  className?: string
}

export function CountdownTimer({ deadline, onExpire, compact = false, className }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(() => getTimeRemaining(deadline))

  useEffect(() => {
    const interval = setInterval(() => {
      const r = getTimeRemaining(deadline)
      setRemaining(r)
      if (r.expired) { clearInterval(interval); onExpire?.() }
    }, 1000)
    return () => clearInterval(interval)
  }, [deadline, onExpire])

  if (remaining.expired) {
    return (
      <div className={cn('text-sm font-semibold text-white/40', className)}>
        Registration closed
      </div>
    )
  }

  if (compact) {
    const parts = []
    if (remaining.days > 0) parts.push(`${remaining.days}d`)
    if (remaining.hours > 0) parts.push(`${remaining.hours}h`)
    parts.push(`${remaining.minutes}m`)
    if (remaining.days === 0) parts.push(`${remaining.seconds}s`)
    return (
      <span className={cn('font-mono font-bold text-brand-green tabular-nums', className)}>
        {parts.join(' ')}
      </span>
    )
  }

  return (
    <div className={cn('flex items-end gap-2', className)}>
      {remaining.days > 0 && <TimeUnit value={remaining.days} label="days" />}
      <TimeUnit value={remaining.hours} label="hrs" />
      <TimeUnit value={remaining.minutes} label="min" />
      <TimeUnit value={remaining.seconds} label="sec" urgent={remaining.days === 0 && remaining.hours === 0 && remaining.minutes < 5} />
    </div>
  )
}

function TimeUnit({ value, label, urgent = false }: { value: number; label: string; urgent?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn(
        'relative w-14 h-13 flex items-center justify-center rounded-xl font-mono font-bold text-[1.4rem] tabular-nums transition-colors',
        urgent
          ? 'bg-error/20 text-error border border-error/20'
          : 'bg-white/[0.08] text-white border border-white/10'
      )}>
        {String(value).padStart(2, '0')}
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">{label}</span>
    </div>
  )
}