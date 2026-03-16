// src/app/api/paypal/create-order/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createPayPalOrder } from '@/lib/paypal'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const file = 'src/app/api/paypal/create-order/route.ts'

  try {
    const { entryId } = await request.json()

    if (!entryId) {
      return NextResponse.json(
        { success: false, error: 'Entry ID required.' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Get settings for entry fee
    const { data: settings } = await supabase
      .from('settings')
      .select('entry_fee, gameweek_number')
      .single()

    if (!settings) {
      return NextResponse.json(
        { success: false, error: 'Platform settings not found.' },
        { status: 500 }
      )
    }

    // Convert KES to USD for PayPal (approximate — admin should set USD amount separately in production)
    // For now, using a 1:1 approach — admin should configure PayPal with USD pricing
    const usdAmount = (settings.entry_fee / 130).toFixed(2) // rough KES → USD

    logger.paypal.info(`Creating PayPal order for entry ${entryId}`, { file })

    const { orderId } = await createPayPalOrder({
      amount: parseFloat(usdAmount),
      currency: 'USD',
      description: `FPL123 GW${settings.gameweek_number} Entry`,
      reference: `FPL123-${entryId}`,
    })

    // Store order ID in entry
    await supabase
      .from('entries')
      .update({ payment_reference: orderId })
      .eq('id', entryId)

    return NextResponse.json({
      success: true,
      data: { orderId },
    })
  } catch (err) {
    logger.paypal.error(`Create order failed: ${String(err)}`, { file })
    return NextResponse.json(
      { success: false, error: 'Failed to create PayPal order.' },
      { status: 500 }
    )
  }
}
