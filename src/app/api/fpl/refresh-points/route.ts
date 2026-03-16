// src/app/api/fpl/refresh-points/route.ts
// Refresh points for a single manager (called from standings page)

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { refreshManagerGwPoints } from '@/lib/fpl'
import { calculateStandings } from '@/lib/groups'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { fplTeamId, gameweekNumber, groupId } = await request.json()

    if (!fplTeamId || !gameweekNumber || !groupId) {
      return NextResponse.json(
        { success: false, error: 'fplTeamId, gameweekNumber, and groupId are required.' },
        { status: 400 }
      )
    }

    const { gwPoints, transferHits, chipUsed } = await refreshManagerGwPoints(fplTeamId, gameweekNumber)

    const supabase = createServerSupabaseClient()

    await supabase
      .from('group_members')
      .update({
        gw_points: gwPoints,
        transfer_hits: transferHits,
        chip_used: chipUsed,
        last_refreshed_at: new Date().toISOString(),
      })
      .eq('fpl_team_id', fplTeamId)
      .eq('gameweek_number', gameweekNumber)

    // Recalculate group standings
    const { data: groupMembers } = await supabase
      .from('group_members')
      .select('fpl_team_id, gw_points, transfer_hits, chip_used')
      .eq('group_id', groupId)

    if (groupMembers) {
      const positions = calculateStandings(groupMembers)
      for (const [tid, position] of positions.entries()) {
        await supabase
          .from('group_members')
          .update({ standing_position: position })
          .eq('group_id', groupId)
          .eq('fpl_team_id', tid)
      }
    }

    logger.fpl.success(`Refreshed GW${gameweekNumber} points for FPL ID ${fplTeamId}: ${gwPoints} pts`, {
      file: 'src/app/api/fpl/refresh-points/route.ts',
    })

    return NextResponse.json({
      success: true,
      data: { gwPoints, transferHits, chipUsed },
    })
  } catch (err) {
    logger.fpl.error(`Refresh points failed: ${String(err)}`, {
      file: 'src/app/api/fpl/refresh-points/route.ts',
    })
    return NextResponse.json(
      { success: false, error: 'Failed to refresh points.' },
      { status: 500 }
    )
  }
}
