// src/app/api/admin/hall-of-fame/update/route.ts
// Updates the all-time hall_of_fame table after payouts are sent

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const file = 'src/app/api/admin/hall-of-fame/update/route.ts'
  const supabase = createServerSupabaseClient()

  try {
    // 1. Get current GW
    const { data: settings } = await supabase
      .from('settings')
      .select('gameweek_number')
      .single()

    if (!settings) {
      return NextResponse.json({ success: false, error: 'Settings not found.' }, { status: 500 })
    }

    const gw = settings.gameweek_number

    // 2. Get all sent payouts for this GW
    const { data: sentPayouts, error: payoutsError } = await supabase
      .from('payouts')
      .select('fpl_team_id, manager_name, fpl_team_name, amount, position')
      .eq('gameweek_number', gw)
      .eq('status', 'sent')

    if (payoutsError) {
      return NextResponse.json({ success: false, error: payoutsError.message }, { status: 500 })
    }

    // 3. Get GW points for winners from group_members
    const winnerTeamIds = (sentPayouts ?? []).map(p => p.fpl_team_id)

    const { data: memberPoints } = await supabase
      .from('group_members')
      .select('fpl_team_id, gw_points')
      .eq('gameweek_number', gw)
      .in('fpl_team_id', winnerTeamIds.length > 0 ? winnerTeamIds : [-1])

    const pointsMap = new Map((memberPoints ?? []).map(m => [m.fpl_team_id, m.gw_points]))

    // 4. Update hall_of_fame for each winner
    let winnersUpdated = 0

    for (const payout of sentPayouts ?? []) {
      const gwPoints = pointsMap.get(payout.fpl_team_id) ?? 0

      // Check if row already exists
      const { data: existing } = await supabase
        .from('hall_of_fame')
        .select('*')
        .eq('fpl_team_id', payout.fpl_team_id)
        .single()

      if (existing) {
        // Update existing row
        const newHighestPoints = Math.max(existing.highest_gw_points ?? 0, gwPoints)
        const newHighestGw = newHighestPoints > (existing.highest_gw_points ?? 0) ? gw : existing.highest_gw_number

        await supabase
          .from('hall_of_fame')
          .update({
            total_wins: (existing.total_wins ?? 0) + 1,
            total_points: (existing.total_points ?? 0) + gwPoints,
            highest_gw_points: newHighestPoints,
            highest_gw_number: newHighestGw,
            total_amount_won: (existing.total_amount_won ?? 0) + payout.amount,
            gameweeks_participated: (existing.gameweeks_participated ?? 0) + 1,
          })
          .eq('fpl_team_id', payout.fpl_team_id)
      } else {
        // Insert new row
        await supabase.from('hall_of_fame').insert({
          fpl_team_id: payout.fpl_team_id,
          manager_name: payout.manager_name,
          fpl_team_name: payout.fpl_team_name,
          total_wins: 1,
          total_points: gwPoints,
          highest_gw_points: gwPoints,
          highest_gw_number: gw,
          total_amount_won: payout.amount,
          gameweeks_participated: 1,
        })
      }

      winnersUpdated++
    }

    // 5. Update gameweeks_participated for ALL confirmed entries this GW (non-winners)
    const { data: allEntries } = await supabase
      .from('entries')
      .select('fpl_team_id, manager_name, fpl_team_name')
      .eq('gameweek_number', gw)
      .eq('payment_status', 'confirmed')

    const winnerIds = new Set(winnerTeamIds)
    const nonWinners = (allEntries ?? []).filter(e => !winnerIds.has(e.fpl_team_id))

    let participantsUpdated = 0

    for (const entry of nonWinners) {
      const { data: existing } = await supabase
        .from('hall_of_fame')
        .select('gameweeks_participated')
        .eq('fpl_team_id', entry.fpl_team_id)
        .single()

      if (existing) {
        await supabase
          .from('hall_of_fame')
          .update({ gameweeks_participated: (existing.gameweeks_participated ?? 0) + 1 })
          .eq('fpl_team_id', entry.fpl_team_id)
      } else {
        await supabase.from('hall_of_fame').insert({
          fpl_team_id: entry.fpl_team_id,
          manager_name: entry.manager_name,
          fpl_team_name: entry.fpl_team_name,
          total_wins: 0,
          total_points: 0,
          highest_gw_points: 0,
          highest_gw_number: null,
          total_amount_won: 0,
          gameweeks_participated: 1,
        })
      }

      participantsUpdated++
    }

    logger.info?.(
      `Hall of Fame updated for GW${gw}: ${winnersUpdated} winners, ${participantsUpdated} participants`,
      { file }
    )

    return NextResponse.json({
      success: true,
      data: { winnersUpdated, participantsUpdated },
    })
  } catch (err) {
    logger.payouts?.error?.(`Hall of Fame update error: ${String(err)}`, { file })
    return NextResponse.json({ success: false, error: 'Failed to update Hall of Fame.' }, { status: 500 })
  }
}