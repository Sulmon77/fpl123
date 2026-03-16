// src/app/api/cron/refresh-standings/route.ts
// Runs every 30 minutes — refreshes GW points for all group members

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { refreshManagerGwPoints } from '@/lib/fpl'
import { calculateStandings } from '@/lib/groups'
import { logger } from '@/lib/logger'

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  logger.cron.info('Running standings refresh cron job', {
    file: 'src/app/api/cron/refresh-standings/route.ts',
  })

  try {
    const supabase = createServerSupabaseClient()

    const { data: settings } = await supabase
      .from('settings')
      .select('gameweek_number, standings_refresh_interval')
      .single()

    if (!settings) {
      return NextResponse.json({ success: false, reason: 'No settings' })
    }

    // Check if there are any groups allocated
    const { data: groups } = await supabase
      .from('groups')
      .select('id')
      .eq('gameweek_number', settings.gameweek_number)
      .limit(1)

    if (!groups?.length) {
      logger.cron.info('No groups found — skipping standings refresh', {
        file: 'src/app/api/cron/refresh-standings/route.ts',
      })
      return NextResponse.json({ success: true, reason: 'No groups yet' })
    }

    // Get all members
    const { data: members } = await supabase
      .from('group_members')
      .select('id, group_id, fpl_team_id')
      .eq('gameweek_number', settings.gameweek_number)

    if (!members?.length) {
      return NextResponse.json({ success: true, reason: 'No members' })
    }

    logger.cron.info(`Refreshing ${members.length} members for GW${settings.gameweek_number}`, {
      file: 'src/app/api/cron/refresh-standings/route.ts',
    })

    let refreshed = 0
    let failed = 0

    for (const member of members) {
      try {
        const { gwPoints, transferHits, chipUsed } = await refreshManagerGwPoints(
          member.fpl_team_id,
          settings.gameweek_number
        )

        await supabase
          .from('group_members')
          .update({
            gw_points: gwPoints,
            transfer_hits: transferHits,
            chip_used: chipUsed,
            last_refreshed_at: new Date().toISOString(),
          })
          .eq('id', member.id)

        refreshed++
        await sleep(150) // respect FPL rate limits
      } catch (err) {
        logger.cron.error(
          `Failed to refresh FPL ID ${member.fpl_team_id}: ${String(err)}`,
          { file: 'src/app/api/cron/refresh-standings/route.ts' }
        )
        failed++
      }
    }

    // Recalculate positions for all groups
    const groupIds = [...new Set(members.map(m => m.group_id))]
    for (const groupId of groupIds) {
      const { data: groupMembers } = await supabase
        .from('group_members')
        .select('fpl_team_id, gw_points, transfer_hits, chip_used')
        .eq('group_id', groupId)

      if (!groupMembers) continue

      const positions = calculateStandings(groupMembers)

      for (const [fplTeamId, position] of positions.entries()) {
        await supabase
          .from('group_members')
          .update({ standing_position: position })
          .eq('group_id', groupId)
          .eq('fpl_team_id', fplTeamId)
      }
    }

    logger.cron.success(
      `[CRON STANDINGS] Refreshed ${refreshed} managers. ${failed} failed. Next refresh in ${settings.standings_refresh_interval}min`,
      { file: 'src/app/api/cron/refresh-standings/route.ts' }
    )

    return NextResponse.json({
      success: true,
      data: { refreshed, failed, total: members.length },
    })
  } catch (err) {
    logger.cron.error(`Standings refresh cron failed: ${String(err)}`, {
      file: 'src/app/api/cron/refresh-standings/route.ts',
    })
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
