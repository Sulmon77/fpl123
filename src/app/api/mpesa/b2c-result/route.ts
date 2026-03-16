// src/app/api/mpesa/b2c-result/route.ts
// Receives B2C payout results from Safaricom

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const file = 'src/app/api/mpesa/b2c-result/route.ts'

  try {
    const body = await request.json()

    logger.mpesa.info('Received B2C result callback', {
      file,
      function: 'POST /api/mpesa/b2c-result',
    })

    const result = body?.Result
    if (!result) {
      logger.mpesa.warn('B2C callback missing Result body', { file })
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' })
    }

    const {
      ResultCode,
      ResultDesc,
      ConversationID,
      OriginatorConversationID,
      ResultParameters,
    } = result

    logger.mpesa.info(
      `B2C Result: ConversationID=${ConversationID}, ResultCode=${ResultCode}, Desc=${ResultDesc}`,
      { file }
    )

    const supabase = createServerSupabaseClient()

    // Extract transaction ID from result parameters
    let transactionId: string | null = null
    if (ResultParameters?.ResultParameter) {
      const params = Array.isArray(ResultParameters.ResultParameter)
        ? ResultParameters.ResultParameter
        : [ResultParameters.ResultParameter]

      const txnParam = params.find(
        (p: { Key: string; Value: unknown }) => p.Key === 'TransactionID'
      )
      if (txnParam) transactionId = String(txnParam.Value)
    }

    if (ResultCode === 0) {
      // Payout successful
      logger.mpesa.success(
        `B2C payout successful. ConversationID: ${ConversationID}, TxnID: ${transactionId}`,
        { file }
      )

      // Update payout record by ConversationID (stored in notes during trigger)
      await supabase
        .from('payouts')
        .update({
          status: 'sent',
          completed_at: new Date().toISOString(),
          mpesa_transaction_id: transactionId,
        })
        .ilike('notes', `%${ConversationID}%`)
    } else {
      // Payout failed
      logger.mpesa.error(
        `B2C payout failed. ConversationID: ${ConversationID}, Reason: ${ResultDesc}`,
        { file }
      )

      await supabase
        .from('payouts')
        .update({
          status: 'failed',
          notes: `Failed: ${ResultDesc} (ConversationID: ${ConversationID})`,
        })
        .ilike('notes', `%${ConversationID}%`)
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' })
  } catch (err) {
    logger.mpesa.error(`B2C result processing error: ${String(err)}`, {
      file,
      function: 'POST /api/mpesa/b2c-result',
      stack: err instanceof Error ? err.stack : undefined,
    })

    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' })
  }
}
