// src/app/api/admin/refresh-points/route.ts
// Refreshes GW points for ALL group members by calling FPL API

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'
import { refreshManagerGwPoints } from '@/lib/fpl'
import { calculateStandings } from '@/lib/groups'
import { logger } from '@/lib/logger'

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function POST(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const supabase = createServerSupabaseClient()
  const { data: settings } = await supabase.from('settings').select('gameweek_number').single()

  if (!settings) {
    return NextResponse.json({ success: false, error: 'Settings not found.' }, { status: 500 })
  }

  const { gameweek_number } = settings

  logger.standings.info(`Starting points refresh for GW${gameweek_number}`, {
    file: 'src/app/api/admin/refresh-points/route.ts',
  })

  // Get all group members for this GW
  const { data: members, error } = await supabase
    .from('group_members')
    .select('id, group_id, fpl_team_id')
    .eq('gameweek_number', gameweek_number)

  if (error || !members) {
    return NextResponse.json({ success: false, error: 'No group members found.' }, { status: 404 })
  }

  logger.standings.info(`Refreshing ${members.length} managers`, {
    file: 'src/app/api/admin/refresh-points/route.ts',
  })

  let refreshed = 0
  let failed = 0

  for (const member of members) {
    try {
      const { gwPoints, transferHits, chipUsed } = await refreshManagerGwPoints(
        member.fpl_team_id,
        gameweek_number
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
      await sleep(100) // avoid FPL rate limiting
    } catch (err) {
      logger.standings.error(`Failed to refresh FPL ID ${member.fpl_team_id}: ${String(err)}`, {
        file: 'src/app/api/admin/refresh-points/route.ts',
      })
      failed++
    }
  }

  // Recalculate standings for each group
  const { data: groups } = await supabase
    .from('groups')
    .select('id')
    .eq('gameweek_number', gameweek_number)

  if (groups) {
    for (const group of groups) {
      const { data: groupMembers } = await supabase
        .from('group_members')
        .select('fpl_team_id, gw_points, transfer_hits, chip_used')
        .eq('group_id', group.id)

      if (!groupMembers) continue

      const positions = calculateStandings(groupMembers)

      for (const [fplTeamId, position] of positions.entries()) {
        await supabase
          .from('group_members')
          .update({ standing_position: position })
          .eq('group_id', group.id)
          .eq('fpl_team_id', fplTeamId)
      }
    }
  }

  logger.standings.success(
    `[CRON STANDINGS] Refreshed ${refreshed} managers. ${failed} failed. Next refresh per settings.`,
    { file: 'src/app/api/admin/refresh-points/route.ts' }
  )

  return NextResponse.json({
    success: true,
    data: { refreshed, failed, total: members.length },
  })
}
