// src/app/api/standings/[groupId]/refresh/route.ts
// User-triggered refresh for a specific group.
// Fetches live FPL data for all members of the group, updates the DB,
// then returns the fresh standings — same shape as the GET /api/standings/[groupId] response.
// Rate-limited: max 1 refresh per group per 60 seconds (prevents abuse).

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { calculateStandings } from '@/lib/groups'
import { calculateGroupPrizes, prizeForPosition } from '@/lib/prizes'
import type { TierSettings } from '@/types'

const FPL_BASE = 'https://fantasy.premierleague.com/api'

// Simple in-memory rate limit: groupId → last refresh timestamp
// Resets on each server restart (fine for this use case)
const lastRefreshTime = new Map<string, number>()
const RATE_LIMIT_MS = 60_000 // 60 seconds between user-triggered refreshes per group

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
      { next: { revalidate: 0 } }
    )
    if (!res.ok) return null
    const data: FplPicksResponse = await res.json()

    const chip = data.active_chip ?? null
    const normalizedChip =
      chip === 'wildcard' ? 'wildcard'
      : chip === 'freehit' ? 'freehit'
      : chip === 'bboost' ? 'bboost'
      : chip === '3xc' ? '3xc'
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params

  if (!groupId) {
    return NextResponse.json({ success: false, error: 'Group ID is required.' }, { status: 400 })
  }

  // Rate limit check
  const now = Date.now()
  const last = lastRefreshTime.get(groupId) ?? 0
  const elapsed = now - last
  if (elapsed < RATE_LIMIT_MS) {
    const waitSecs = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000)
    return NextResponse.json(
      { success: false, error: `Please wait ${waitSecs}s before refreshing again.`, rateLimited: true },
      { status: 429 }
    )
  }
  lastRefreshTime.set(groupId, now)

  const supabase = createServerSupabaseClient()

  // Fetch group + members
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
    .select('gameweek_number, casual_settings, elite_settings, standings_refresh_interval')
    .single()

  if (!settings) {
    return NextResponse.json({ success: false, error: 'Settings not found.' }, { status: 500 })
  }

  const members = group.group_members ?? []
  const gw = group.gameweek_number
  const groupTier = group.entry_tier ?? 'casual'
  const tierSettings: TierSettings = groupTier === 'elite'
    ? (settings.elite_settings as TierSettings)
    : (settings.casual_settings as TierSettings)

  // Fetch fresh FPL points for all members in parallel
  const pointsResults = await Promise.all(
    members.map(async member => {
      const result = await fetchMemberPoints(member.fpl_team_id, gw)
      return { member, result }
    })
  )

  // Build updated member data
  const updatedMembers = pointsResults.map(({ member, result }) => ({
    id: member.id,
    fpl_team_id: member.fpl_team_id,
    fpl_team_name: member.fpl_team_name,
    manager_name: member.manager_name,
    gw_points: result?.points ?? member.gw_points,
    transfer_hits: result?.transferHits ?? member.transfer_hits,
    chip_used: result ? result.chipUsed : member.chip_used,
    last_refreshed_at: member.last_refreshed_at,
  }))

  // Recalculate positions and prizes
  const positionMap = calculateStandings(updatedMembers)
  const prizeCalc = calculateGroupPrizes(updatedMembers.length, tierSettings)
  const refreshedAt = new Date().toISOString()

  // Write updated data back to DB
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
          prize_amount: prizeAmount,
          last_refreshed_at: refreshedAt,
        })
        .eq('id', member.id)
    })
  )

  // Build response standings (same shape as GET)
  const standings = updatedMembers.map(member => {
    const position = positionMap.get(member.fpl_team_id) ?? 999
    const prizeAmount = prizeForPosition(position, prizeCalc)
    const isClean = member.transfer_hits === 0 && !member.chip_used
    return {
      fpl_team_id: member.fpl_team_id,
      fpl_team_name: member.fpl_team_name,
      manager_name: member.manager_name,
      gw_points: member.gw_points,
      transfer_hits: member.transfer_hits,
      chip_used: member.chip_used,
      standing_position: position,
      prize_amount: prizeAmount,
      is_clean: isClean,
      last_refreshed_at: refreshedAt,
    }
  }).sort((a, b) => a.standing_position - b.standing_position)

  return NextResponse.json({
    success: true,
    data: {
      groupId: group.id,
      groupNumber: group.group_number,
      gameweekNumber: gw,
      entryTier: groupTier,
      standings,
      prizesByPosition: prizeCalc.prizesByPosition,
      winnersPerGroup: prizeCalc.winnersPerGroup,
      totalPot: prizeCalc.totalPot,
      distributablePot: prizeCalc.distributablePot,
      lastRefreshed: refreshedAt,
      refreshInterval: settings.standings_refresh_interval ?? 30,
    },
  })
}