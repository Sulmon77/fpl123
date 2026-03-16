// src/app/api/standings/[groupId]/route.ts
// Returns standings for a specific group

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { calculateStandings } from '@/lib/groups'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const file = 'src/app/api/standings/[groupId]/route.ts'

  try {
    const { groupId } = await params

    const supabase = createServerSupabaseClient()

    // Get group info + members
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select(`
        id,
        group_number,
        gameweek_number,
        allocated_at,
        group_members (
          id,
          fpl_team_id,
          fpl_team_name,
          manager_name,
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
      return NextResponse.json(
        { success: false, error: 'Group not found.' },
        { status: 404 }
      )
    }

    // Get settings for prize info
    const { data: settings } = await supabase
      .from('settings')
      .select('winners_per_group, payout_percentages, entry_fee, gameweek_number, standings_refresh_interval')
      .single()

    // Get total members in this group for pot calculation
    const groupSize = group.group_members.length
    const totalPot = (settings?.entry_fee ?? 200) * groupSize
    const platformCut = settings?.payout_percentages?.platform ?? 10
    const distributablePot = Math.floor(totalPot * (1 - platformCut / 100))

    // Sort members by standing position (or recalculate)
    const members = group.group_members
    const positions = calculateStandings(members)

    // Build sorted standings
    const standings = members
      .map((m) => ({
        ...m,
        standing_position: positions.get(m.fpl_team_id) ?? m.standing_position,
        is_clean: m.transfer_hits === 0 && !m.chip_used,
      }))
      .sort((a, b) => {
        const posA = positions.get(a.fpl_team_id) ?? 999
        const posB = positions.get(b.fpl_team_id) ?? 999
        return posA - posB
      })

    // Calculate prize amounts per position
    const prizesByPosition: Record<string, number> = {}
    if (settings?.payout_percentages) {
      Object.entries(settings.payout_percentages).forEach(([pos, pct]) => {
        if (pos !== 'platform' && typeof pct === 'number') {
          prizesByPosition[pos] = Math.floor(distributablePot * (pct / 100))
        }
      })
    }

    const lastRefreshed = members
      .map((m) => m.last_refreshed_at)
      .filter(Boolean)
      .sort()
      .pop()

    logger.standings.info(`Serving standings for group ${groupId} (${members.length} members)`, {
      file,
    })

    return NextResponse.json({
      success: true,
      data: {
        groupId: group.id,
        groupNumber: group.group_number,
        gameweekNumber: group.gameweek_number,
        standings,
        prizesByPosition,
        winnersPerGroup: settings?.winners_per_group ?? 2,
        totalPot,
        distributablePot,
        lastRefreshed: lastRefreshed ?? null,
        refreshInterval: settings?.standings_refresh_interval ?? 120,
      },
    })
  } catch (err) {
    logger.standings.error(`Failed to load standings: ${String(err)}`, {
      file,
      function: 'GET /api/standings/[groupId]',
    })

    return NextResponse.json(
      { success: false, error: 'Failed to load standings.' },
      { status: 500 }
    )
  }
}