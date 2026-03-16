// src/app/api/paypal/payout/route.ts
// Direct PayPal payout (called from admin trigger-payouts)
// This is a direct wrapper — actual payout logic lives in trigger-payouts/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { sendPayPalPayout } from '@/lib/paypal'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  try {
    const { email, amount, note, senderItemId } = await request.json()

    if (!email || !amount || !senderItemId) {
      return NextResponse.json(
        { success: false, error: 'email, amount, and senderItemId are required.' },
        { status: 400 }
      )
    }

    const result = await sendPayPalPayout({
      email,
      amount,
      note: note || 'FPL123 Prize Payout',
      senderItemId,
    })

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    logger.paypal.success(`Direct payout to ${email}: $${amount}`, {
      file: 'src/app/api/paypal/payout/route.ts',
    })

    return NextResponse.json({ success: true, data: { batchId: result.batchId } })
  } catch (err) {
    logger.paypal.error(`PayPal direct payout failed: ${String(err)}`, {
      file: 'src/app/api/paypal/payout/route.ts',
    })
    return NextResponse.json(
      { success: false, error: 'PayPal payout failed.' },
      { status: 500 }
    )
  }
}
