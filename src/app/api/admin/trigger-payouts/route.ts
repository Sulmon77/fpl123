// src/app/api/admin/trigger-payouts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'
import { sendB2cPayment } from '@/lib/mpesa'
import { sendPayPalPayout } from '@/lib/paypal'
import { logger } from '@/lib/logger'

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function POST(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const { payoutIds } = await request.json() // optional: specific payout IDs, else process all pending

  const supabase = createServerSupabaseClient()

  let query = supabase.from('payouts').select('*').eq('status', 'pending')
  if (payoutIds?.length) {
    query = query.in('id', payoutIds)
  }

  const { data: payouts, error } = await query

  if (error || !payouts?.length) {
    return NextResponse.json(
      { success: false, error: 'No pending payouts found.' },
      { status: 404 }
    )
  }

  logger.payouts.info(`Triggering ${payouts.length} payouts`, {
    file: 'src/app/api/admin/trigger-payouts/route.ts',
  })

  const results: Array<{ id: string; status: 'sent' | 'failed'; error?: string }> = []

  for (const payout of payouts) {
    try {
      // Mark as in-progress
      await supabase
        .from('payouts')
        .update({ triggered_at: new Date().toISOString(), status: 'pending' })
        .eq('id', payout.id)

      if (payout.payment_method === 'mpesa') {
        const result = await sendB2cPayment({
          phone: payout.payment_detail,
          amount: payout.amount,
          remarks: `FPL123 GW${payout.gameweek_number} Prize`,
          occasion: `GW${payout.gameweek_number} #${payout.position} — ${payout.manager_name}`,
        })

        await supabase
          .from('payouts')
          .update({
            notes: `ConversationID: ${result.ConversationID}`,
          })
          .eq('id', payout.id)

        results.push({ id: payout.id, status: 'sent' })
        logger.payouts.success(
          `M-Pesa payout sent to ${payout.manager_name}: ${payout.amount} KES`,
          { file: 'src/app/api/admin/trigger-payouts/route.ts' }
        )
      } else if (payout.payment_method === 'paypal') {
        const result = await sendPayPalPayout({
          email: payout.payment_detail,
          amount: payout.amount / 130, // rough KES to USD
          note: `FPL123 GW${payout.gameweek_number} Prize — Position #${payout.position}`,
          senderItemId: payout.id,
        })

        if (result.success) {
          await supabase
            .from('payouts')
            .update({ status: 'sent', completed_at: new Date().toISOString() })
            .eq('id', payout.id)
          results.push({ id: payout.id, status: 'sent' })
        } else {
          throw new Error(result.error)
        }
      }
    } catch (err) {
      logger.payouts.error(
        `Payout failed for ${payout.manager_name}: ${String(err)}`,
        { file: 'src/app/api/admin/trigger-payouts/route.ts' }
      )

      await supabase
        .from('payouts')
        .update({ status: 'failed', notes: `Error: ${String(err)}` })
        .eq('id', payout.id)

      results.push({ id: payout.id, status: 'failed', error: String(err) })
    }

    await sleep(300) // brief pause between payouts
  }

  const sent = results.filter(r => r.status === 'sent').length
  const failed = results.filter(r => r.status === 'failed').length

  logger.payouts.success(`Payouts complete: ${sent} sent, ${failed} failed`, {
    file: 'src/app/api/admin/trigger-payouts/route.ts',
  })

  return NextResponse.json({
    success: true,
    data: { sent, failed, total: payouts.length, results },
  })
}
