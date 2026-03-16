// src/app/api/paypal/capture-order/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { capturePayPalOrder } from '@/lib/paypal'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const file = 'src/app/api/paypal/capture-order/route.ts'

  try {
    const { orderId, entryId } = await request.json()

    if (!orderId || !entryId) {
      return NextResponse.json(
        { success: false, error: 'Order ID and Entry ID required.' },
        { status: 400 }
      )
    }

    logger.paypal.info(`Capturing PayPal order ${orderId} for entry ${entryId}`, { file })

    const result = await capturePayPalOrder(orderId)

    if (!result.success) {
      logger.paypal.error(`Capture failed for order ${orderId}`, { file })
      return NextResponse.json(
        { success: false, error: 'PayPal payment could not be captured.' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Confirm entry
    const { data: entry, error } = await supabase
      .from('entries')
      .update({
        payment_status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        payment_reference: orderId,
      })
      .eq('id', entryId)
      .select('pin, fpl_team_id, fpl_team_name, manager_name, gameweek_number')
      .single()

    if (error || !entry) {
      logger.paypal.error(`Failed to confirm entry ${entryId}: ${error?.message}`, { file })
      return NextResponse.json(
        { success: false, error: 'Payment captured but entry confirmation failed. Contact admin.' },
        { status: 500 }
      )
    }

    logger.paypal.success(`PayPal payment confirmed for entry ${entryId}`, { file })

    return NextResponse.json({
      success: true,
      data: {
        pin: entry.pin,
        fplTeamId: entry.fpl_team_id,
        fplTeamName: entry.fpl_team_name,
        managerName: entry.manager_name,
        gameweekNumber: entry.gameweek_number,
      },
    })
  } catch (err) {
    logger.paypal.error(`Capture order failed: ${String(err)}`, { file })
    return NextResponse.json(
      { success: false, error: 'Failed to capture PayPal payment.' },
      { status: 500 }
    )
  }
}
