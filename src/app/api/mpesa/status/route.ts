// src/app/api/mpesa/status/route.ts
// Client polls this endpoint every 5 seconds to check payment status

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const file = 'src/app/api/mpesa/status/route.ts'

  try {
    const { searchParams } = new URL(request.url)
    const checkoutRequestId = searchParams.get('ref')
    const entryId = searchParams.get('entryId')

    if (!checkoutRequestId && !entryId) {
      return NextResponse.json(
        { success: false, error: 'Missing ref or entryId parameter.' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    let query = supabase
      .from('entries')
      .select('id, payment_status, payment_reference, pin, fpl_team_id, fpl_team_name, manager_name, gameweek_number')

    if (entryId) {
      query = query.eq('id', entryId)
    } else {
      query = query.eq('payment_reference', checkoutRequestId)
    }

    const { data: entry, error } = await query.single()

    if (error || !entry) {
      return NextResponse.json(
        { success: false, error: 'Entry not found.' },
        { status: 404 }
      )
    }

    // Check if payment reference indicates failure
    const isFailed = entry.payment_reference?.startsWith('FAILED_')

    let status: 'pending' | 'confirmed' | 'failed' | 'cancelled'
    let message: string

    if (entry.payment_status === 'confirmed') {
      status = 'confirmed'
      message = 'Payment confirmed! You\'re in.'
    } else if (isFailed) {
      status = 'failed'
      message = 'Payment failed or was cancelled. Please try again.'
    } else {
      status = 'pending'
      message = 'Waiting for payment confirmation...'
    }

    logger.mpesa.info(
      `Status check for entry ${entry.id}: ${status}`,
      { file, function: 'GET /api/mpesa/status' }
    )

    return NextResponse.json({
      success: true,
      data: {
        status,
        message,
        entryId: entry.id,
        // Only return PIN if confirmed
        ...(status === 'confirmed' && {
          pin: entry.pin,
          fplTeamId: entry.fpl_team_id,
          fplTeamName: entry.fpl_team_name,
          managerName: entry.manager_name,
          gameweekNumber: entry.gameweek_number,
        }),
      },
    })
  } catch (err) {
    logger.mpesa.error(`Status check error: ${String(err)}`, {
      file,
      function: 'GET /api/mpesa/status',
    })

    return NextResponse.json(
      { success: false, error: 'Failed to check payment status.' },
      { status: 500 }
    )
  }
}
