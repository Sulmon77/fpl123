// src/app/api/fpl/verify/route.ts
// Verifies FPL Team ID:
// 1. Exists in FPL
// 2. Is in the FPL123 league
// 3. Hasn't already entered this GW
// 4. Is not blacklisted

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { resolveManager, isManagerInLeague } from '@/lib/fpl'
import { logger } from '@/lib/logger'
import { isValidFplTeamId } from '@/lib/utils'

export async function POST(request: NextRequest) {
  const file = 'src/app/api/fpl/verify/route.ts'

  try {
    const body = await request.json()
    const { fplTeamId, gameweekNumber } = body

    logger.fpl.info(`Verifying FPL ID: ${fplTeamId} for GW${gameweekNumber}`, {
      file,
      function: 'POST /api/fpl/verify',
      input: { fplTeamId, gameweekNumber },
    })

    // Validate input
    if (!isValidFplTeamId(fplTeamId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid FPL Team ID format.' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Check blacklist
    const { data: blacklisted } = await supabase
      .from('blacklist')
      .select('type, reason')
      .eq('type', 'fpl_id')
      .eq('value', fplTeamId.toString())
      .single()

    if (blacklisted) {
      logger.fpl.warn(`Blacklisted FPL ID attempted registration: ${fplTeamId}`, { file })
      return NextResponse.json(
        {
          success: false,
          error: 'This FPL ID is not permitted on this platform. Contact admin if you believe this is an error.',
          errorCode: 'BLACKLISTED',
        },
        { status: 403 }
      )
    }

    // Check if already entered this GW
    const { data: existingEntry } = await supabase
      .from('entries')
      .select('id, payment_status')
      .eq('fpl_team_id', fplTeamId)
      .eq('gameweek_number', gameweekNumber)
      .single()

    if (existingEntry) {
      const statusMsg =
        existingEntry.payment_status === 'pending'
          ? 'You have a pending payment for this gameweek. Please complete or cancel it first.'
          : `This FPL ID has already entered Gameweek ${gameweekNumber}.`

      return NextResponse.json(
        {
          success: false,
          error: statusMsg,
          errorCode: 'ALREADY_ENTERED',
        },
        { status: 409 }
      )
    }

    // Resolve manager from FPL API (validates existence)
    let manager
    try {
      manager = await resolveManager(Number(fplTeamId), gameweekNumber)
    } catch (err) {
      const errorMsg = String(err)
      if (errorMsg.includes('FPL_NOT_FOUND')) {
        return NextResponse.json(
          {
            success: false,
            error: 'FPL Team ID not found. Please check and try again.',
            errorCode: 'FPL_NOT_FOUND',
          },
          { status: 404 }
        )
      }
      throw err
    }

    // Check league membership
    const inLeague = await isManagerInLeague(Number(fplTeamId))
    if (!inLeague) {
      const joinUrl = process.env.FPL_LEAGUE_JOIN_URL || 'https://fantasy.premierleague.com'
      return NextResponse.json(
        {
          success: false,
          error: `You are not in the FPL123 league. Join here first: ${joinUrl}`,
          errorCode: 'NOT_IN_LEAGUE',
          joinUrl,
        },
        { status: 403 }
      )
    }

    logger.fpl.success(`FPL ID ${fplTeamId} verified: ${manager.manager_name}`, { file })

    return NextResponse.json({
      success: true,
      data: { manager },
    })
  } catch (err) {
    logger.fpl.error(`Unexpected error in FPL verify: ${String(err)}`, {
      file,
      function: 'POST /api/fpl/verify',
      stack: err instanceof Error ? err.stack : undefined,
    })

    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
