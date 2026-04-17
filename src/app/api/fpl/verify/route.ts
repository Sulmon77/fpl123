// src/app/api/fpl/verify/route.ts
// Verifies that an FPL team ID exists and is in the correct league.
// Does NOT block on pending entries — only confirmed entries block re-entry.

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { logger } from '@/lib/logger'

const FPL_BASE = 'https://fantasy.premierleague.com/api'

async function fetchFplEntry(teamId: number) {
  const res = await fetch(`${FPL_BASE}/entry/${teamId}/`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

async function checkLeagueMembership(
  teamId: number,
  leagueId: number
): Promise<boolean> {
  const file = 'src/app/api/fpl/verify/route.ts'
  try {
    // 1. Check classic leagues on the entry summary (Cache bypassed)
    const entryRes = await fetch(`${FPL_BASE}/entry/${teamId}/`, {
      cache: 'no-store',
    })

    if (entryRes.ok) {
      const data = await entryRes.json()
      const leagues: Array<{ id: number }> = data?.leagues?.classic ?? []
      if (leagues.some((l) => l.id === leagueId)) {
        logger.fpl.info(`Found ID ${teamId} via direct profile check.`, { file })
        return true
      }
    }

    // 2. FPL API Fallback Check: 
    // Check the league's actual endpoint. This handles the FPL API caching delay.
    const leagueRes = await fetch(`${FPL_BASE}/leagues-classic/${leagueId}/standings/`, {
      cache: 'no-store',
    })

    if (leagueRes.ok) {
      const leagueData = await leagueRes.json()

      // Look in new_entries
      const newEntries: Array<{ entry: number, entry_name: string }> = leagueData?.new_entries?.results ?? []
      if (newEntries.some((e) => e.entry === teamId)) {
        logger.fpl.info(`Found ID ${teamId} via league new_entries fallback.`, { file })
        return true
      }

      // Look in standard standings (just in case they joined before a standings update)
      const standings: Array<{ entry: number }> = leagueData?.standings?.results ?? []
      if (standings.some((e) => e.entry === teamId)) {
        logger.fpl.info(`Found ID ${teamId} via league standings fallback.`, { file })
        return true
      }

      // DEBUGGING EXPOSURE: If we get here, they really aren't in the list.
      // Let's print the top 5 recent entries so you can see if there was a typo.
      const recentIds = newEntries.slice(0, 5).map(e => `${e.entry} (${e.entry_name})`).join(', ')
      logger.fpl.warn(`Membership check failed for ${teamId}. Recent IDs in league: [${recentIds}]`, { file })
    }

    return false
  } catch (error) {
    logger.fpl.error(`League membership check error: ${error}`, { file })
    return false
  }
}

export async function POST(request: NextRequest) {
  const file = 'src/app/api/fpl/verify/route.ts'

  try {
    const body = await request.json()
    const { fplTeamId, gameweekNumber } = body

    // Ensure fplTeamId is treated as a number
    const numericTeamId = Number(fplTeamId)

    logger.fpl.info(`Verifying FPL ID: ${numericTeamId} for GW${gameweekNumber}`, {
      file,
      function: 'POST /api/fpl/verify',
      input: { numericTeamId, gameweekNumber },
    })

    if (!numericTeamId || !gameweekNumber) {
      return NextResponse.json(
        { success: false, error: 'FPL Team ID and gameweek number are required.' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // ── Check registration status ──────────────────────────────
    const { data: settings } = await supabase
      .from('settings')
      .select('registration_open, gameweek_number')
      .single()

    if (!settings?.registration_open) {
      return NextResponse.json(
        { success: false, error: 'Registration is currently closed.' },
        { status: 403 }
      )
    }

    // ── Check blacklist ────────────────────────────────────────
    const { data: blacklisted } = await supabase
      .from('blacklist')
      .select('id')
      .eq('type', 'fpl_id')
      .eq('value', numericTeamId.toString())
      .single()

    if (blacklisted) {
      return NextResponse.json(
        {
          success: false,
          error: 'This FPL ID is not permitted on this platform.',
          errorCode: 'BLACKLISTED',
        },
        { status: 403 }
      )
    }

    // ── Check for existing entry — ONLY block on confirmed ─────
    const { data: existingEntry } = await supabase
      .from('entries')
      .select('id, payment_status, entry_tier')
      .eq('fpl_team_id', numericTeamId)
      .eq('gameweek_number', gameweekNumber)
      .single()

    if (existingEntry && existingEntry.payment_status === 'confirmed') {
      return NextResponse.json(
        {
          success: false,
          error: 'This FPL ID has already entered this gameweek.',
          errorCode: 'ALREADY_ENTERED',
          data: { entryTier: existingEntry.entry_tier },
        },
        { status: 409 }
      )
    }

    // ── Fetch FPL entry from API ───────────────────────────────
    const fplEntry = await fetchFplEntry(numericTeamId)

    if (!fplEntry) {
      return NextResponse.json(
        {
          success: false,
          error: 'FPL Team ID not found. Please check and try again.',
        },
        { status: 404 }
      )
    }

    // ── Check league membership ────────────────────────────────
    const leagueId = parseInt(process.env.FPL_LEAGUE_ID ?? '0')
    const joinUrl = process.env.FPL_LEAGUE_JOIN_URL ?? null

    if (leagueId) {
      const inLeague = await checkLeagueMembership(numericTeamId, leagueId)
      if (!inLeague) {
        return NextResponse.json(
          {
            success: false,
            error: "You're not in our FPL league yet. Join the league first, then come back to enter.",
            errorCode: 'NOT_IN_LEAGUE',
            joinUrl,
          },
          { status: 403 }
        )
      }
    }

    // ── Build manager response ─────────────────────────────────
    const manager = {
      fpl_team_id: fplEntry.id,
      manager_name: `${fplEntry.player_first_name} ${fplEntry.player_last_name}`,
      fpl_team_name: fplEntry.name,
      overall_rank: fplEntry.summary_overall_rank ?? 0,
      overall_points: fplEntry.summary_overall_points ?? 0,
      last_gw_points: fplEntry.summary_event_points ?? 0,
      transfer_hits: 0,
      chip_used: null,
    }

    logger.fpl.success(`Verified FPL ID ${numericTeamId}: ${manager.manager_name}`, { file })

    return NextResponse.json({
      success: true,
      data: { manager },
    })
  } catch (err) {
    logger.fpl.error(`Verify error: ${String(err)}`, {
      file,
      function: 'POST /api/fpl/verify',
      stack: err instanceof Error ? err.stack : undefined,
    })

    return NextResponse.json(
      { success: false, error: 'Failed to verify FPL ID. Please try again.' },
      { status: 500 }
    )
  }
}