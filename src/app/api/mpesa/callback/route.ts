// src/app/api/mpesa/callback/route.ts
// Safaricom STK Push callback webhook
// Called by Safaricom servers when payment completes/fails

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { MpesaCallback } from '@/types'

export async function POST(request: NextRequest) {
  const file = 'src/app/api/mpesa/callback/route.ts'

  try {
    const body: MpesaCallback = await request.json()

    logger.mpesa.info('Received STK callback from Safaricom', {
      file,
      function: 'POST /api/mpesa/callback',
    })

    const { stkCallback } = body.Body
    const {
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback

    logger.mpesa.info(
      `Callback: CheckoutRequestID=${CheckoutRequestID}, ResultCode=${ResultCode}, Desc=${ResultDesc}`,
      { file }
    )

    const supabase = createServerSupabaseClient()

    // Find entry by CheckoutRequestID
    const { data: entry, error: findError } = await supabase
      .from('entries')
      .select('id, fpl_team_id, fpl_team_name, manager_name, gameweek_number, pin')
      .eq('payment_reference', CheckoutRequestID)
      .single()

    if (findError || !entry) {
      logger.mpesa.error(
        `No entry found for CheckoutRequestID: ${CheckoutRequestID}`,
        { file, function: 'POST /api/mpesa/callback' }
      )
      // Still return 200 to Safaricom — we don't want retries for unknown IDs
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' })
    }

    if (ResultCode === 0) {
      // Payment successful
      // Extract M-Pesa receipt from metadata
      const items = CallbackMetadata?.Item ?? []
      const mpesaReceiptNumber = items.find((i) => i.Name === 'MpesaReceiptNumber')?.Value
      const transactionDate = items.find((i) => i.Name === 'TransactionDate')?.Value
      const phoneNumber = items.find((i) => i.Name === 'PhoneNumber')?.Value

      logger.mpesa.success(
        `Payment confirmed for entry ${entry.id}. Receipt: ${mpesaReceiptNumber}`,
        { file }
      )

      // Update entry to confirmed
      const { error: updateError } = await supabase
        .from('entries')
        .update({
          payment_status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          // Store receipt number in notes via payment_reference update
        })
        .eq('id', entry.id)

      if (updateError) {
        logger.mpesa.error(
          `Failed to confirm entry ${entry.id}: ${updateError.message}`,
          { file }
        )
      }
    } else {
      // Payment failed or cancelled
      logger.mpesa.warn(
        `Payment failed for CheckoutRequestID ${CheckoutRequestID}: ${ResultDesc}`,
        { file }
      )

      // Don't delete entry — keep as pending so user can retry
      // The status polling endpoint will return 'failed' for non-zero result codes
      await supabase
        .from('entries')
        .update({
          payment_reference: `FAILED_${CheckoutRequestID}`,
        })
        .eq('id', entry.id)
    }

    // Always return success to Safaricom
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' })
  } catch (err) {
    logger.mpesa.error(`Callback processing error: ${String(err)}`, {
      file,
      function: 'POST /api/mpesa/callback',
      stack: err instanceof Error ? err.stack : undefined,
    })

    // Still return 200 to Safaricom to prevent retries
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' })
  }
}
