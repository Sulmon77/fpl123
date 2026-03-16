// src/lib/pin.ts
// PIN generation and validation utilities

import { createServerSupabaseClient } from './supabase'

/**
 * Generate a random 4-digit PIN
 * Avoids trivially guessable PINs like 0000, 1111, 1234
 */
export function generatePin(): string {
  const trivial = new Set([
    '0000', '1111', '2222', '3333', '4444',
    '5555', '6666', '7777', '8888', '9999',
    '1234', '4321', '0123', '9876',
  ])

  let pin: string
  do {
    pin = Math.floor(1000 + Math.random() * 9000).toString()
  } while (trivial.has(pin))

  return pin
}

/**
 * Validate PIN format
 */
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin)
}

/**
 * Check if a PIN matches for a given FPL team ID in the current GW
 * Returns entry details if valid
 */
export async function validatePin(
  fplTeamId: number,
  pin: string,
  gameweekNumber: number
): Promise<{
  valid: boolean
  reason?: 'not_found' | 'wrong_pin' | 'pin_revoked' | 'no_groups'
  entryId?: string
}> {
  const supabase = createServerSupabaseClient()

  // Find entry
  const { data: entry, error } = await supabase
    .from('entries')
    .select('id, pin, pin_active, payment_status, disqualified')
    .eq('fpl_team_id', fplTeamId)
    .eq('gameweek_number', gameweekNumber)
    .eq('payment_status', 'confirmed')
    .single()

  if (error || !entry) {
    return { valid: false, reason: 'not_found' }
  }

  if (entry.pin !== pin) {
    return { valid: false, reason: 'wrong_pin' }
  }

  if (!entry.pin_active) {
    return { valid: false, reason: 'pin_revoked' }
  }

  // Check if groups have been allocated
  const { data: groupMember } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('fpl_team_id', fplTeamId)
    .eq('gameweek_number', gameweekNumber)
    .single()

  if (!groupMember) {
    return { valid: false, reason: 'no_groups' }
  }

  return { valid: true, entryId: entry.id }
}
