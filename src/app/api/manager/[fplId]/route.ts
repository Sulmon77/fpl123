// src/app/api/manager/[fplId]/route.ts
// PIN auth for standings — returns groupId, groupNumber, entry tier
// Returns a clear not-allocated message if manager is confirmed but groups haven't been created yet

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fplId: string }> }
) {
  const { fplId } = await params

  try {
    const body = await request.json()
    const { pin, gameweekNumber } = body

    if (!fplId || !pin || !gameweekNumber) {
      return NextResponse.json(
        { success: false, error: 'FPL ID, PIN, and gameweek number are required.' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Find the confirmed entry
    const { data: entry, error: entryError } = await supabase
      .from('entries')
      .select('id, pin, pin_active, payment_status, disqualified, entry_tier')
      .eq('fpl_team_id', parseInt(fplId))
      .eq('gameweek_number', gameweekNumber)
      .single()

    if (entryError || !entry) {
      return NextResponse.json(
        { success: false, error: 'No entry found for this FPL ID in the current gameweek.' },
        { status: 404 }
      )
    }

    if (entry.payment_status !== 'confirmed') {
      return NextResponse.json(
        { success: false, error: 'Your payment has not been confirmed yet. Please complete your payment first.' },
        { status: 403 }
      )
    }

    if (entry.disqualified) {
      return NextResponse.json(
        { success: false, error: 'This entry has been disqualified.' },
        { status: 403 }
      )
    }

    if (!entry.pin_active) {
      return NextResponse.json(
        { success: false, error: 'Your PIN has been revoked. Please contact the admin.' },
        { status: 403 }
      )
    }

    if (entry.pin !== pin) {
      return NextResponse.json(
        { success: false, error: 'Incorrect PIN. Please check and try again.' },
        { status: 401 }
      )
    }

    // Find the group for this manager
    const { data: groupMember, error: gmError } = await supabase
      .from('group_members')
      .select('group_id, groups(id, group_number, entry_tier)')
      .eq('fpl_team_id', parseInt(fplId))
      .eq('gameweek_number', gameweekNumber)
      .single()

    if (gmError || !groupMember) {
      // Confirmed but not yet in a group — give tier-specific message
      const tierLabel = entry.entry_tier === 'elite' ? 'Elite' : 'Casual'
      return NextResponse.json(
        {
          success: false,
          error: `Your ${tierLabel} group hasn't been allocated yet. Check back soon — groups are created after the registration deadline.`,
          errorCode: 'GROUP_NOT_ALLOCATED',
          data: { entryTier: entry.entry_tier },
        },
        { status: 404 }
      )
    }

    const group = Array.isArray(groupMember.groups)
      ? groupMember.groups[0]
      : groupMember.groups

    return NextResponse.json({
      success: true,
      data: {
        groupId: groupMember.group_id,
        groupNumber: (group as { group_number: number }).group_number,
        entryTier: entry.entry_tier,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}