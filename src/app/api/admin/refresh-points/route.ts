// src/app/api/admin/refresh-points/route.ts
// Fetches live GW points from FPL API for all group members,
// recalculates standings positions AND prize_amounts, writes everything to DB.

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'
import { calculateStandings } from '@/lib/groups'
import { calculateGroupPrizes, prizeForPosition } from '@/lib/prizes'
import { logger } from '@/lib/logger'
import type { TierSettings } from '@/types'

const FPL_BASE = 'https://fantasy.premierleague.com/api'
const FILE = 'src/app/api/admin/refresh-points/route.ts'

interface FplPicksResponse {
  active_chip: string | null
  entry_history: {
    points: number
    event_transfers_cost: number
  }
}

async function fetchMemberPoints(
  fplTeamId: number,
  gameweekNumber: number
): Promise<{ points: number; transferHits: number; chipUsed: string | null } | null> {
  try {
    const res = await fetch(
      `${FPL_BASE}/entry/${fplTeamId}/event/${gameweekNumber}/picks/`,
      { next: { revalidate: 0 } }   // always fresh
    )
    if (!res.ok) return null
    const data: FplPicksResponse = await res.json()

    const chipUsed = data.active_chip ?? null
    const normalizedChip =
      chipUsed === 'wildcard' ? 'wildcard'
      : chipUsed === 'freehit' ? 'freehit'
      : chipUsed === 'bboost' ? 'bboost'
      : chipUsed === '3xc' ? '3xc'
      : null

    return {
      points: data.entry_history.points,
      transferHits: data.entry_history.event_transfers_cost,
      chipUsed: normalizedChip,
    }
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const supabase = createServerSupabaseClient()

  // Get current GW + tier settings
  const { data: settings } = await supabase
    .from('settings')
    .select('gameweek_number, casual_settings, elite_settings')
    .single()

  if (!settings) {
    return NextResponse.json({ success: false, error: 'Settings not found.' }, { status: 500 })
  }

  const gw = settings.gameweek_number

  // Fetch all groups with their members for the current GW
  const { data: groups, error: groupsError } = await supabase
    .from('groups')
    .select(`
      id,
      entry_tier,
      group_members (
        id,
        fpl_team_id,
        gw_points,
        transfer_hits,
        chip_used,
        standing_position
      )
    `)
    .eq('gameweek_number', gw)

  if (groupsError || !groups) {
    return NextResponse.json({ success: false, error: 'Failed to fetch groups.' }, { status: 500 })
  }

  let refreshed = 0
  let failed = 0

  for (const group of groups) {
    const members = group.group_members ?? []
    if (members.length === 0) continue

    const groupTier = group.entry_tier ?? 'casual'
    const tierSettings: TierSettings = groupTier === 'elite'
      ? (settings.elite_settings as TierSettings)
      : (settings.casual_settings as TierSettings)

    // ── Step 1: Fetch fresh FPL points for every member in parallel ──
    const pointsResults = await Promise.all(
      members.map(async member => {
        const result = await fetchMemberPoints(member.fpl_team_id, gw)
        return { member, result }
      })
    )

    // ── Step 2: Build updated member list with fresh points ──────────
    const updatedMembers: Array<{
      id: string
      fpl_team_id: number
      gw_points: number
      transfer_hits: number
      chip_used: string | null
    }> = []

    for (const { member, result } of pointsResults) {
      if (result) {
        updatedMembers.push({
          id: member.id,
          fpl_team_id: member.fpl_team_id,
          gw_points: result.points,
          transfer_hits: result.transferHits,
          chip_used: result.chipUsed,
        })
        refreshed++
      } else {
        // Keep existing values if FPL API failed for this member
        updatedMembers.push({
          id: member.id,
          fpl_team_id: member.fpl_team_id,
          gw_points: member.gw_points,
          transfer_hits: member.transfer_hits,
          chip_used: member.chip_used,
        })
        failed++
      }
    }

    // ── Step 3: Recalculate standings positions ──────────────────────
    const positionMap = calculateStandings(updatedMembers)

    // ── Step 4: Calculate prize amounts using tier settings ──────────
    const prizeCalc = calculateGroupPrizes(updatedMembers.length, tierSettings)

    // ── Step 5: Write everything back to DB ──────────────────────────
    const now = new Date().toISOString()

    await Promise.all(
      updatedMembers.map(member => {
        const position = positionMap.get(member.fpl_team_id) ?? 999
        const prizeAmount = prizeForPosition(position, prizeCalc)

        return supabase
          .from('group_members')
          .update({
            gw_points: member.gw_points,
            transfer_hits: member.transfer_hits,
            chip_used: member.chip_used,
            standing_position: position,
            prize_amount: prizeAmount,   // ← this was missing before
            last_refreshed_at: now,
          })
          .eq('id', member.id)
      })
    )
  }

  logger.groups.success(
    `Refresh points: ${refreshed} refreshed, ${failed} failed for GW${gw}`,
    { file: FILE }
  )

  return NextResponse.json({
    success: true,
    data: { refreshed, failed },
  })
}