// src/app/api/admin/refund/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'
import { sendB2cPayment } from '@/lib/mpesa'
import { refundPayPalCapture } from '@/lib/paypal'
import { logger } from '@/lib/logger'

// POST /api/admin/refund
// Body: { entryId: string, amount: number }
//
// Flow:
//  1. Fetch the entry — must be confirmed
//  2. Send money back via M-Pesa B2C or PayPal refund
//  3. On success: set payment_status = 'refunded', deactivate PIN,
//     remove from group_members if allocated, then DELETE the entry row
//  4. Return success with confirmation details

export async function POST(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const supabase = createServerSupabaseClient()

  let body: { entryId?: string; amount?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const { entryId, amount } = body

  if (!entryId || !amount || amount <= 0) {
    return NextResponse.json({ success: false, error: 'entryId and a positive amount are required.' }, { status: 400 })
  }

  // Fetch the entry
  const { data: entry, error: fetchError } = await supabase
    .from('entries')
    .select('*')
    .eq('id', entryId)
    .single()

  if (fetchError || !entry) {
    return NextResponse.json({ success: false, error: 'Entry not found.' }, { status: 404 })
  }

  if (entry.payment_status === 'refunded') {
    return NextResponse.json({ success: false, error: 'This entry has already been refunded.' }, { status: 400 })
  }

  if (entry.payment_status !== 'confirmed') {
    return NextResponse.json({
      success: false,
      error: 'Only confirmed entries can be refunded. To remove a pending entry, use Decline instead.',
    }, { status: 400 })
  }

  logger.info(`Refunding entry ${entryId} for ${entry.manager_name} via ${entry.payment_method}`, {
    file: 'src/app/api/admin/refund/route.ts',
  })

  // ── Step 1: Send the money back ─────────────────────────────────────────
  let refundReference = ''

  try {
    if (entry.payment_method === 'mpesa') {
      if (!entry.payment_phone) {
        return NextResponse.json({ success: false, error: 'No M-Pesa phone number on record for this entry.' }, { status: 400 })
      }

      const result = await sendB2cPayment({
        phone: entry.payment_phone,
        amount,
        remarks: `FPL123 GW${entry.gameweek_number} Refund`,
        occasion: `Refund for ${entry.manager_name}`,
      })
      refundReference = result.ConversationID

    } else if (entry.payment_method === 'paypal') {
      if (!entry.payment_reference) {
        return NextResponse.json({
          success: false,
          error: 'No PayPal capture ID on record for this entry. Cannot process automatic refund. Please refund manually through PayPal.',
        }, { status: 400 })
      }

      // payment_reference stores the PayPal capture ID after a successful capture
      const amountUSD = amount / 130 // rough KES→USD conversion
      const result = await refundPayPalCapture(entry.payment_reference, amountUSD)

      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: `PayPal refund failed: ${result.error}. Please refund manually through PayPal dashboard.`,
        }, { status: 500 })
      }
      refundReference = result.refundId ?? ''

    } else if (entry.payment_method === 'manual') {
      // Manual entries have no payment provider — just remove them
      refundReference = 'manual-no-payment'
    }
  } catch (err) {
    logger.error(`Refund payment failed for ${entryId}: ${String(err)}`, {
      file: 'src/app/api/admin/refund/route.ts',
    })
    return NextResponse.json({
      success: false,
      error: `Payment refund failed: ${String(err)}. No changes were made. Please check your M-Pesa/PayPal credentials.`,
    }, { status: 500 })
  }

  // ── Step 2: Remove from group_members if allocated ──────────────────────
  await supabase
    .from('group_members')
    .delete()
    .eq('fpl_team_id', entry.fpl_team_id)
    .eq('gameweek_number', entry.gameweek_number)

  // ── Step 3: Delete the entry entirely ───────────────────────────────────
  const { error: deleteError } = await supabase
    .from('entries')
    .delete()
    .eq('id', entryId)

  if (deleteError) {
    // Money was sent but DB cleanup failed — log this clearly
    logger.error(`CRITICAL: Refund payment sent (ref: ${refundReference}) but entry deletion failed: ${deleteError.message}`, {
      file: 'src/app/api/admin/refund/route.ts',
    })
    return NextResponse.json({
      success: false,
      error: `Refund was sent successfully (ref: ${refundReference}), but the entry could not be removed from the database. Please delete entry ${entryId} manually from Supabase.`,
    }, { status: 500 })
  }

  logger.info(`Refund complete for ${entry.manager_name}. Ref: ${refundReference}`, {
    file: 'src/app/api/admin/refund/route.ts',
  })

  return NextResponse.json({
    success: true,
    data: {
      managerName: entry.manager_name,
      amount,
      paymentMethod: entry.payment_method,
      refundReference,
      message: `Refund of KES ${amount} successfully sent to ${entry.manager_name}. Entry has been removed from the system.`,
    },
  })
}
