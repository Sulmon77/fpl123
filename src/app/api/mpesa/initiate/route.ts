// src/app/api/mpesa/initiate/route.ts
// Initiates M-Pesa STK Push for entry payment

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { initiateStkPush, validateMpesaPhone } from '@/lib/mpesa'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const file = 'src/app/api/mpesa/initiate/route.ts'

  try {
    const body = await request.json()
    const { entryId, phone, gameweekNumber } = body

    logger.mpesa.info(`STK Push request for entry ${entryId}`, {
      file,
      function: 'POST /api/mpesa/initiate',
      input: { entryId, phone: phone?.slice(0, 6) + '****', gameweekNumber },
    })

    if (!entryId || !phone) {
      return NextResponse.json(
        { success: false, error: 'Entry ID and phone number are required.' },
        { status: 400 }
      )
    }

    // Validate phone
    const phoneValidation = validateMpesaPhone(phone)
    if (!phoneValidation.valid) {
      return NextResponse.json(
        { success: false, error: phoneValidation.error },
        { status: 400 }
      )
    }

    const formattedPhone = phoneValidation.formatted!
    const supabase = createServerSupabaseClient()

    // Get entry
    const { data: entry, error: entryError } = await supabase
      .from('entries')
      .select('id, fpl_team_id, payment_status, payment_reference')
      .eq('id', entryId)
      .single()

    if (entryError || !entry) {
      return NextResponse.json(
        { success: false, error: 'Entry not found.' },
        { status: 404 }
      )
    }

    if (entry.payment_status === 'confirmed') {
      return NextResponse.json(
        { success: false, error: 'Payment already confirmed for this entry.' },
        { status: 409 }
      )
    }

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

    // Initiate STK Push
    const stkResult = await initiateStkPush({
      phone: formattedPhone,
      amount: settings.entry_fee,
      accountReference: `FPL123-GW${settings.gameweek_number}`,
      description: `FPL123 GW${settings.gameweek_number} Entry`,
    })

    // Save checkout request ID to entry
    await supabase
      .from('entries')
      .update({
        payment_reference: stkResult.CheckoutRequestID,
        payment_phone: formattedPhone,
      })
      .eq('id', entryId)

    logger.mpesa.success(
      `STK Push sent for entry ${entryId}. CheckoutRequestID: ${stkResult.CheckoutRequestID}`,
      { file }
    )

    return NextResponse.json({
      success: true,
      data: {
        checkoutRequestId: stkResult.CheckoutRequestID,
        merchantRequestId: stkResult.MerchantRequestID,
        message: 'STK Push sent to your phone. Enter your M-Pesa PIN when prompted.',
      },
    })
  } catch (err) {
    logger.mpesa.error(`STK Push failed: ${String(err)}`, {
      file,
      function: 'POST /api/mpesa/initiate',
      stack: err instanceof Error ? err.stack : undefined,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initiate M-Pesa payment. Please try again.',
      },
      { status: 500 }
    )
  }
}
