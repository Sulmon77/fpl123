// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format KES amount
export function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString('en-KE')}`
}

// Format date/time nicely
export function formatDeadline(isoString: string): string {
  try {
    const date = parseISO(isoString)
    return format(date, "EEEE d MMM yyyy 'at' HH:mm 'BST'")
  } catch {
    return isoString
  }
}

// Format short datetime
export function formatShort(isoString: string): string {
  try {
    const date = parseISO(isoString)
    return format(date, 'dd MMM HH:mm')
  } catch {
    return isoString
  }
}

// Time ago
export function timeAgo(isoString: string): string {
  try {
    const date = parseISO(isoString)
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return isoString
  }
}

// Chip display labels
export const CHIP_LABELS: Record<string, string> = {
  wildcard: 'WC',
  freehit: 'FH',
  bboost: 'BB',
  '3xc': '3C',
}

export const CHIP_NAMES: Record<string, string> = {
  wildcard: 'Wildcard',
  freehit: 'Free Hit',
  bboost: 'Bench Boost',
  '3xc': 'Triple Captain',
}

// Position emoji
export function positionEmoji(position: number): string {
  if (position === 1) return '🥇'
  if (position === 2) return '🥈'
  if (position === 3) return '🥉'
  return `#${position}`
}

// Format overall rank
export function formatRank(rank: number): string {
  if (!rank) return 'N/A'
  return rank.toLocaleString('en-US')
}

// Truncate text
export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n - 1) + '…' : str
}

// Validate FPL Team ID format
export function isValidFplTeamId(id: unknown): id is number {
  const num = Number(id)
  return Number.isInteger(num) && num > 0 && num < 100_000_000
}

// Check if deadline has passed
export function isDeadlinePassed(deadline: string | null): boolean {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

// Generate a random entry ID suffix for display
export function shortId(id: string): string {
  return id.slice(-8).toUpperCase()
}

// Calculate time remaining
export function getTimeRemaining(deadline: string): {
  days: number
  hours: number
  minutes: number
  seconds: number
  expired: boolean
} {
  const now = new Date().getTime()
  const target = new Date(deadline).getTime()
  const diff = target - now

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return { days, hours, minutes, seconds, expired: false }
}
