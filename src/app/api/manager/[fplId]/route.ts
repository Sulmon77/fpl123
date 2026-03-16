// src/app/api/manager/[fplId]/route.ts
// Authenticate manager with PIN and return their group ID

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fplId: string }> }
) {
  const file = 'src/app/api/manager/[fplId]/route.ts'

  try {
    const { fplId } = await params
    const fplTeamId = parseInt(fplId)
    const { pin, gameweekNumber } = await request.json()

    if (!fplTeamId || !pin || !gameweekNumber) {
      return NextResponse.json(
        { success: false, error: 'FPL ID, PIN, and gameweek number are required.' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Find entry
    const { data: entry, error: entryError } = await supabase
      .from('entries')
      .select('id, pin, pin_active, payment_status, disqualified')
      .eq('fpl_team_id', fplTeamId)
      .eq('gameweek_number', gameweekNumber)
      .single()

    if (entryError || !entry) {
      return NextResponse.json(
        {
          success: false,
          error: 'FPL ID not registered for this gameweek.',
          errorCode: 'NOT_REGISTERED',
        },
        { status: 404 }
      )
    }

    if (entry.payment_status !== 'confirmed') {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment not confirmed for this entry.',
          errorCode: 'PAYMENT_PENDING',
        },
        { status: 403 }
      )
    }

    if (entry.pin !== pin) {
      logger.auth.warn(`Wrong PIN attempt for FPL ID ${fplTeamId}`, { file })
      return NextResponse.json(
        {
          success: false,
          error: 'Incorrect PIN.',
          errorCode: 'WRONG_PIN',
        },
        { status: 401 }
      )
    }

    if (!entry.pin_active) {
      return NextResponse.json(
        {
          success: false,
          error: 'Your PIN has been revoked. Please contact admin.',
          errorCode: 'PIN_REVOKED',
        },
        { status: 403 }
      )
    }

    // Find group membership
    const { data: groupMember, error: groupError } = await supabase
      .from('group_members')
      .select('group_id, groups(group_number, gameweek_number)')
      .eq('fpl_team_id', fplTeamId)
      .eq('gameweek_number', gameweekNumber)
      .single()

    if (groupError || !groupMember) {
      return NextResponse.json(
        {
          success: false,
          error: 'Groups have not been allocated yet. Check back after the GW deadline.',
          errorCode: 'NO_GROUPS',
        },
        { status: 404 }
      )
    }

    const group = groupMember.groups as unknown as { group_number: number; gameweek_number: number } | null

    logger.auth.success(`PIN verified for FPL ID ${fplTeamId}, group ${group?.group_number}`, { file })

    return NextResponse.json({
      success: true,
      data: {
        groupId: groupMember.group_id,
        groupNumber: group?.group_number,
        gameweekNumber: group?.gameweek_number,
        disqualified: entry.disqualified,
      },
    })
  } catch (err) {
    logger.auth.error(`Manager auth error: ${String(err)}`, {
      file,
      function: 'POST /api/manager/[fplId]',
    })

    return NextResponse.json(
      { success: false, error: 'Authentication failed. Please try again.' },
      { status: 500 }
    )
  }
}