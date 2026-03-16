// src/app/api/admin/refund/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'
import { sendB2cPayment } from '@/lib/mpesa'
import { refundPayPalCapture } from '@/lib/paypal'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const { entryId, amount } = await request.json()
  if (!entryId || !amount) {
    return NextResponse.json({ success: false, error: 'Entry ID and amount required.' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()

  const { data: entry, error: findError } = await supabase
    .from('entries')
    .select('*')
    .eq('id', entryId)
    .single()

  if (findError || !entry) {
    return NextResponse.json({ success: false, error: 'Entry not found.' }, { status: 404 })
  }

  logger.payouts.info(`Processing refund for entry ${entryId}: ${amount} KES via ${entry.payment_method}`, {
    file: 'src/app/api/admin/refund/route.ts',
  })

  try {
    if (entry.payment_method === 'mpesa' && entry.payment_phone) {
      await sendB2cPayment({
        phone: entry.payment_phone,
        amount,
        remarks: `FPL123 refund - GW${entry.gameweek_number}`,
        occasion: `Refund for ${entry.manager_name}`,
      })
    } else if (entry.payment_method === 'paypal' && entry.payment_reference) {
      await refundPayPalCapture(entry.payment_reference)
    }

    // Mark entry as refunded
    await supabase
      .from('entries')
      .update({ payment_status: 'refunded', pin_active: false })
      .eq('id', entryId)

    logger.payouts.success(`Refund processed for entry ${entryId}`, {
      file: 'src/app/api/admin/refund/route.ts',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.payouts.error(`Refund failed for entry ${entryId}: ${String(err)}`, {
      file: 'src/app/api/admin/refund/route.ts',
    })
    return NextResponse.json({ success: false, error: `Refund failed: ${String(err)}` }, { status: 500 })
  }
}
