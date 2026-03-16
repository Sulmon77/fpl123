// src/lib/groups.ts
// Group allocation logic — random shuffle into groups of up to 32

import { createServerSupabaseClient } from './supabase'
import { logger } from './logger'

const MAX_GROUP_SIZE = 32

/**
 * Shuffle an array in place using Fisher-Yates algorithm
 */
function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Allocate confirmed entries into random groups of up to 32
 * This is the main allocation function called by admin or cron
 */
export async function allocateGroups(gameweekNumber: number): Promise<{
  success: boolean
  groupCount: number
  memberCount: number
  error?: string
}> {
  const supabase = createServerSupabaseClient()

  logger.groups.info(`Starting group allocation for GW${gameweekNumber}`, {
    file: 'src/lib/groups.ts',
    function: 'allocateGroups',
    input: { gameweekNumber },
  })

  // Check if groups already allocated
  const { data: existingGroups } = await supabase
    .from('groups')
    .select('id')
    .eq('gameweek_number', gameweekNumber)
    .limit(1)

  if (existingGroups && existingGroups.length > 0) {
    logger.groups.warn(`Groups already allocated for GW${gameweekNumber}`, {
      file: 'src/lib/groups.ts',
    })
    return { success: false, groupCount: 0, memberCount: 0, error: 'Groups already allocated' }
  }

  // Fetch all confirmed, non-disqualified entries
  const { data: entries, error: entriesError } = await supabase
    .from('entries')
    .select('fpl_team_id, fpl_team_name, manager_name')
    .eq('gameweek_number', gameweekNumber)
    .eq('payment_status', 'confirmed')
    .eq('disqualified', false)

  if (entriesError) {
    logger.groups.error(`Failed to fetch entries for allocation: ${entriesError.message}`, {
      file: 'src/lib/groups.ts',
      function: 'allocateGroups',
    })
    return { success: false, groupCount: 0, memberCount: 0, error: entriesError.message }
  }

  if (!entries || entries.length === 0) {
    logger.groups.warn(`No confirmed entries found for GW${gameweekNumber}`, {
      file: 'src/lib/groups.ts',
    })
    return { success: false, groupCount: 0, memberCount: 0, error: 'No confirmed entries' }
  }

  logger.groups.info(`Found ${entries.length} confirmed entries to allocate`, {
    file: 'src/lib/groups.ts',
  })

  // Shuffle entries randomly
  const shuffled = shuffle(entries)

  // Split into chunks of MAX_GROUP_SIZE
  const chunks: typeof entries[] = []
  for (let i = 0; i < shuffled.length; i += MAX_GROUP_SIZE) {
    chunks.push(shuffled.slice(i, i + MAX_GROUP_SIZE))
  }

  logger.groups.info(`Creating ${chunks.length} groups`, { file: 'src/lib/groups.ts' })

  // Insert groups and members
  let totalMembers = 0
  for (let i = 0; i < chunks.length; i++) {
    const groupNumber = i + 1
    const chunk = chunks[i]

    // Create group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        gameweek_number: gameweekNumber,
        group_number: groupNumber,
      })
      .select()
      .single()

    if (groupError || !group) {
      logger.groups.error(`Failed to create group ${groupNumber}: ${groupError?.message}`, {
        file: 'src/lib/groups.ts',
        function: 'allocateGroups',
      })
      continue
    }

    // Create group members
    const memberInserts = chunk.map((entry) => ({
      group_id: group.id,
      fpl_team_id: entry.fpl_team_id,
      fpl_team_name: entry.fpl_team_name,
      manager_name: entry.manager_name,
      gameweek_number: gameweekNumber,
      gw_points: 0,
      transfer_hits: 0,
      chip_used: null,
      standing_position: null,
      prize_amount: 0,
    }))

    const { error: membersError } = await supabase.from('group_members').insert(memberInserts)

    if (membersError) {
      logger.groups.error(`Failed to insert members for group ${groupNumber}: ${membersError.message}`, {
        file: 'src/lib/groups.ts',
        function: 'allocateGroups',
      })
      continue
    }

    totalMembers += chunk.length
    logger.groups.info(`Group ${groupNumber} created with ${chunk.length} members`, {
      file: 'src/lib/groups.ts',
    })
  }

  logger.groups.success(
    `[CRON AUTO-GROUPS] Allocated ${totalMembers} managers into ${chunks.length} groups for GW${gameweekNumber}`,
    { file: 'src/lib/groups.ts' }
  )

  return {
    success: true,
    groupCount: chunks.length,
    memberCount: totalMembers,
  }
}

/**
 * Calculate standings positions within a group
 * Tiebreaker: clean managers (no hits, no chip) ranked higher at same points
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
    // Primary sort: points descending
    if (b.gw_points !== a.gw_points) {
      return b.gw_points - a.gw_points
    }
    // Tiebreaker: clean managers rank higher
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
 * Calculate prize amounts for a group based on settings
 */
export function calculatePrizes(
  members: Array<{ fpl_team_id: number; standing_position: number | null }>,
  totalPot: number,
  payoutPercentages: Record<string, number>,
  winnersPerGroup: number
): Map<number, number> {
  const prizes = new Map<number, number>()

  // Platform keeps its cut
  const platformCut = payoutPercentages['platform'] ?? 0
  const distributablePot = Math.floor(totalPot * (1 - platformCut / 100))

  members.forEach((member) => {
    if (!member.standing_position) return

    const positionKey = member.standing_position.toString()
    const percentage = payoutPercentages[positionKey]

    if (percentage && member.standing_position <= winnersPerGroup) {
      const amount = Math.floor(distributablePot * (percentage / 100))
      prizes.set(member.fpl_team_id, amount)
    } else {
      prizes.set(member.fpl_team_id, 0)
    }
  })

  return prizes
}
