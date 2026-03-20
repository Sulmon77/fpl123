// src/lib/groups.ts
// Group allocation logic — tier-aware, random shuffle

import { createServerSupabaseClient } from './supabase'
import { logger } from './logger'
import type { EntryTier, TierSettings } from '@/types'

function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Allocate confirmed entries for a gameweek into random groups.
 * When tier is specified, only allocates that tier.
 * When tier is undefined, allocates both tiers independently.
 */
export async function allocateGroups(
  gameweekNumber: number,
  tier?: EntryTier
): Promise<{
  success: boolean
  groupCount: number
  memberCount: number
  error?: string
}> {
  const supabase = createServerSupabaseClient()

  const tiersToProcess: EntryTier[] = tier ? [tier] : ['casual', 'elite']

  logger.groups.info(
    `Starting group allocation for GW${gameweekNumber} tier(s): ${tiersToProcess.join(', ')}`,
    { file: 'src/lib/groups.ts', function: 'allocateGroups' }
  )

  // Get tier settings for group sizes
  const { data: settings } = await supabase
    .from('settings')
    .select('casual_settings, elite_settings')
    .single()

  const casualSettings = settings?.casual_settings as TierSettings | undefined
  const eliteSettings = settings?.elite_settings as TierSettings | undefined

  let totalGroups = 0
  let totalMembers = 0

  for (const currentTier of tiersToProcess) {
    const maxGroupSize =
      currentTier === 'elite'
        ? (eliteSettings?.max_group_size ?? 8)
        : (casualSettings?.max_group_size ?? 16)

    // Check if groups already allocated for this tier
    const { data: existingGroups } = await supabase
      .from('groups')
      .select('id')
      .eq('gameweek_number', gameweekNumber)
      .eq('entry_tier', currentTier)
      .limit(1)

    if (existingGroups && existingGroups.length > 0) {
      logger.groups.warn(`Groups already allocated for GW${gameweekNumber} tier:${currentTier}`, {
        file: 'src/lib/groups.ts',
      })
      if (tiersToProcess.length === 1) {
        return { success: false, groupCount: 0, memberCount: 0, error: `Groups already allocated for ${currentTier}` }
      }
      continue
    }

    // Get the highest existing group_number for this GW (across tiers) to avoid collision
    const { data: existingGroupNumbers } = await supabase
      .from('groups')
      .select('group_number')
      .eq('gameweek_number', gameweekNumber)
      .order('group_number', { ascending: false })
      .limit(1)

    const groupNumberOffset = existingGroupNumbers?.[0]?.group_number ?? 0

    // Fetch confirmed entries for this tier
    const { data: entries, error: entriesError } = await supabase
      .from('entries')
      .select('fpl_team_id, fpl_team_name, manager_name')
      .eq('gameweek_number', gameweekNumber)
      .eq('payment_status', 'confirmed')
      .eq('disqualified', false)
      .eq('entry_tier', currentTier)

    if (entriesError) {
      logger.groups.error(
        `Failed to fetch ${currentTier} entries: ${entriesError.message}`,
        { file: 'src/lib/groups.ts' }
      )
      return { success: false, groupCount: 0, memberCount: 0, error: entriesError.message }
    }

    if (!entries || entries.length === 0) {
      logger.groups.warn(`No confirmed ${currentTier} entries for GW${gameweekNumber}`, {
        file: 'src/lib/groups.ts',
      })
      // Not a fatal error when allocating both tiers — one might be empty
      if (tiersToProcess.length === 1) {
        return { success: false, groupCount: 0, memberCount: 0, error: `No confirmed ${currentTier} entries` }
      }
      continue
    }

    const shuffled = shuffle(entries)
    const chunks: typeof entries[] = []
    for (let i = 0; i < shuffled.length; i += maxGroupSize) {
      chunks.push(shuffled.slice(i, i + maxGroupSize))
    }

    logger.groups.info(
      `Creating ${chunks.length} ${currentTier} groups (max ${maxGroupSize}/group)`,
      { file: 'src/lib/groups.ts' }
    )

    let tierMembers = 0
    for (let i = 0; i < chunks.length; i++) {
      const groupNumber = groupNumberOffset + i + 1
      const chunk = chunks[i]

      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          gameweek_number: gameweekNumber,
          group_number: groupNumber,
          entry_tier: currentTier,
        })
        .select()
        .single()

      if (groupError || !group) {
        logger.groups.error(`Failed to create ${currentTier} group ${groupNumber}: ${groupError?.message}`, {
          file: 'src/lib/groups.ts',
        })
        continue
      }

      const memberInserts = chunk.map(entry => ({
        group_id: group.id,
        fpl_team_id: entry.fpl_team_id,
        fpl_team_name: entry.fpl_team_name,
        manager_name: entry.manager_name,
        gameweek_number: gameweekNumber,
        entry_tier: currentTier,
        gw_points: 0,
        transfer_hits: 0,
        chip_used: null,
        standing_position: null,
        prize_amount: 0,
      }))

      const { error: membersError } = await supabase.from('group_members').insert(memberInserts)
      if (membersError) {
        logger.groups.error(`Failed to insert members for ${currentTier} group ${groupNumber}: ${membersError.message}`, {
          file: 'src/lib/groups.ts',
        })
        continue
      }

      tierMembers += chunk.length
      totalGroups++
    }

    totalMembers += tierMembers
    logger.groups.info(`${currentTier}: created groups, ${tierMembers} members`, { file: 'src/lib/groups.ts' })
  }

  logger.groups.success(
    `Allocated ${totalMembers} managers into ${totalGroups} groups for GW${gameweekNumber}`,
    { file: 'src/lib/groups.ts' }
  )

  return { success: true, groupCount: totalGroups, memberCount: totalMembers }
}

/**
 * Calculate standings positions within a group
 */
export function calculateStandings(
  members: Array<{
    fpl_team_id: number
    gw_points: number
    transfer_hits: number
    chip_used: string | null
  }>
): Map<number, number> {
  const sorted = [...members].sort((a, b) => {
    if (b.gw_points !== a.gw_points) return b.gw_points - a.gw_points
    const aClean = a.transfer_hits === 0 && !a.chip_used ? 1 : 0
    const bClean = b.transfer_hits === 0 && !b.chip_used ? 1 : 0
    return bClean - aClean
  })

  const positions = new Map<number, number>()
  sorted.forEach((member, index) => {
    positions.set(member.fpl_team_id, index + 1)
  })
  return positions
}

/**
 * Calculate prize amounts for a group
 */
export function calculatePrizes(
  members: Array<{ fpl_team_id: number; standing_position: number | null }>,
  totalPot: number,
  payoutPercentages: Record<string, number>,
  winnersPerGroup: number
): Map<number, number> {
  const prizes = new Map<number, number>()
  const platformCut = payoutPercentages['platform'] ?? 0
  const distributablePot = Math.floor(totalPot * (1 - platformCut / 100))

  members.forEach(member => {
    if (!member.standing_position) return
    const positionKey = member.standing_position.toString()
    const percentage = payoutPercentages[positionKey]
    if (percentage && member.standing_position <= winnersPerGroup) {
      prizes.set(member.fpl_team_id, Math.floor(distributablePot * (percentage / 100)))
    } else {
      prizes.set(member.fpl_team_id, 0)
    }
  })

  return prizes
}