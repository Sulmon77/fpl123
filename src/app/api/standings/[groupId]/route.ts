// src/app/api/standings/[groupId]/route.ts
// Returns standings for a group with correctly calculated prize amounts.

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { calculateStandings } from '@/lib/groups'
import { calculateGroupPrizes, prizeForPosition } from '@/lib/prizes'
import type { TierSettings } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params

  if (!groupId) {
    return NextResponse.json({ success: false, error: 'Group ID is required.' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select(`
      id,
      group_number,
      gameweek_number,
      entry_tier,
      group_members (
        id,
        fpl_team_id,
        fpl_team_name,
        manager_name,
        entry_tier,
        gw_points,
        transfer_hits,
        chip_used,
        standing_position,
        prize_amount,
        last_refreshed_at
      )
    `)
    .eq('id', groupId)
    .single()

  if (groupError || !group) {
    return NextResponse.json({ success: false, error: 'Group not found.' }, { status: 404 })
  }

  const { data: settings } = await supabase
    .from('settings')
    .select('casual_settings, elite_settings, standings_refresh_interval, gameweek_number')
    .single()

  if (!settings) {
    return NextResponse.json({ success: false, error: 'Settings not found.' }, { status: 500 })
  }

  const members = group.group_members ?? []
  const groupTier = group.entry_tier ?? 'casual'
  const tierSettings: TierSettings = groupTier === 'elite'
    ? (settings.elite_settings as TierSettings)
    : (settings.casual_settings as TierSettings)

  // Calculate prizes using the shared helper (single source of truth)
  const prizeCalc = calculateGroupPrizes(members.length, tierSettings)

  // Recalculate live positions from current points
  const positionMap = calculateStandings(members)

  const standings = members.map(member => {
    const livePosition = positionMap.get(member.fpl_team_id) ?? 999
    const livePrizeAmount = prizeForPosition(livePosition, prizeCalc)
    const isClean = member.transfer_hits === 0 && !member.chip_used

    return {
      fpl_team_id: member.fpl_team_id,
      fpl_team_name: member.fpl_team_name,
      manager_name: member.manager_name,
      gw_points: member.gw_points,
      transfer_hits: member.transfer_hits,
      chip_used: member.chip_used,
      standing_position: livePosition,
      prize_amount: livePrizeAmount,
      is_clean: isClean,
      last_refreshed_at: member.last_refreshed_at,
    }
  }).sort((a, b) => a.standing_position - b.standing_position)

  const lastRefreshed = members
    .map(m => m.last_refreshed_at)
    .filter(Boolean)
    .sort()
    .pop() ?? null

  return NextResponse.json({
    success: true,
    data: {
      groupId: group.id,
      groupNumber: group.group_number,
      gameweekNumber: group.gameweek_number,
      entryTier: groupTier,
      standings,
      prizesByPosition: prizeCalc.prizesByPosition,
      winnersPerGroup: prizeCalc.winnersPerGroup,
      totalPot: prizeCalc.totalPot,
      distributablePot: prizeCalc.distributablePot,
      lastRefreshed,
      refreshInterval: settings.standings_refresh_interval ?? 30,
    },
  })
}