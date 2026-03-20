// src/app/api/standings/[groupId]/route.ts
// Returns standings for a group.
// Prize calculation uses the correct tier settings (casual_settings or elite_settings)
// so users always see accurate prize amounts based on admin-configured percentages.

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { calculateStandings } from '@/lib/groups'
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

  // ── Fetch group and its members ──────────────────────────────
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

  // ── Fetch platform settings ───────────────────────────────────
  const { data: settings } = await supabase
    .from('settings')
    .select('casual_settings, elite_settings, standings_refresh_interval, gameweek_number')
    .single()

  if (!settings) {
    return NextResponse.json({ success: false, error: 'Settings not found.' }, { status: 500 })
  }

  const members = group.group_members ?? []

  // ── Resolve the correct tier settings ────────────────────────
  // The group's entry_tier tells us which tier config to use.
  // Fall back gracefully if the column is somehow null (old data).
  const groupTier = group.entry_tier ?? 'casual'
  const tierSettings: TierSettings = groupTier === 'elite'
    ? (settings.elite_settings as TierSettings)
    : (settings.casual_settings as TierSettings)

  const entryFee = tierSettings?.entry_fee ?? 200
  const winnersPerGroup = tierSettings?.winners_per_group ?? 1
  const payoutPercentages: Record<string, number> = tierSettings?.payout_percentages ?? { '1': 90, platform: 10 }

  // ── Calculate prize pool for this group ───────────────────────
  // Total pot = actual number of members × entry fee for this tier.
  const memberCount = members.length
  const totalPot = memberCount * entryFee
  const platformCutPct = payoutPercentages['platform'] ?? 0

  // Prize amounts are calculated directly from totalPot using the admin-set percentages.
  // e.g. if admin sets platform=20%, winner=80%, and totalPot=600:
  //   platform gets 120, winner gets 480. That's it — no double-deduction.
  //
  // distributablePot = sum of all winner prizes (totalPot minus platform cut).
  // This is what we show as "Prize pool" in the UI.

  // ── Build prizesByPosition map ────────────────────────────────
  const prizesByPosition: Record<string, number> = {}
  for (let pos = 1; pos <= winnersPerGroup; pos++) {
    const posKey = pos.toString()
    const pct = payoutPercentages[posKey]
    if (pct && pct > 0) {
      // Prize = totalPot × position percentage (admin already set these to sum with platform to 100%)
      prizesByPosition[posKey] = Math.floor(totalPot * (pct / 100))
    }
  }

  // distributablePot = total minus platform cut (shown as prize pool in UI)
  const distributablePot = Math.floor(totalPot * (1 - platformCutPct / 100))

  // ── Calculate live standings positions ───────────────────────
  // Recalculate positions live from current points data
  // (standings_position in DB may be stale between cron runs).
  const positionMap = calculateStandings(members)

  // ── Build response standings ──────────────────────────────────
  const standings = members.map(member => {
    const livePosition = positionMap.get(member.fpl_team_id) ?? 999
    const isWinner = livePosition <= winnersPerGroup
    const posKey = livePosition.toString()
    const prizePct = payoutPercentages[posKey]
    // Prize = totalPot × the position's percentage (same formula as prizesByPosition above)
    const livePrizeAmount = isWinner && prizePct
      ? Math.floor(totalPot * (prizePct / 100))
      : 0

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

  // Last refresh time
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
      prizesByPosition,
      winnersPerGroup,
      totalPot,
      distributablePot,
      lastRefreshed,
      refreshInterval: settings.standings_refresh_interval ?? 30,
    },
  })
}