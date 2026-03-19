// src/app/api/admin/payouts/mark-sent/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'

// POST /api/admin/payouts/mark-sent
// Body: { payoutIds: string[] }
//
// Marks one or more payouts as 'sent' without calling any payment provider.
// Use this when you have paid winners manually (e.g. M-Pesa person-to-person)
// and need to record the payment in the system.

export async function POST(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const supabase = createServerSupabaseClient()

  let body: { payoutIds?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const { payoutIds } = body

  if (!payoutIds || !Array.isArray(payoutIds) || payoutIds.length === 0) {
    return NextResponse.json(
      { success: false, error: 'payoutIds must be a non-empty array.' },
      { status: 400 }
    )
  }

  // Only mark pending or failed payouts — skip already-sent ones
  const { data: toMark, error: fetchError } = await supabase
    .from('payouts')
    .select('id, manager_name, status')
    .in('id', payoutIds)
    .in('status', ['pending', 'failed'])

  if (fetchError) {
    return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 })
  }

  if (!toMark || toMark.length === 0) {
    return NextResponse.json({
      success: false,
      error: 'No pending or failed payouts found with those IDs.',
    }, { status: 400 })
  }

  const idsToMark = toMark.map(p => p.id)

  const { error: updateError } = await supabase
    .from('payouts')
    .update({
      status: 'sent',
      completed_at: new Date().toISOString(),
      notes: 'Manually marked as sent by admin',
    })
    .in('id', idsToMark)

  if (updateError) {
    return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
  }

  const skipped = payoutIds.length - idsToMark.length

  return NextResponse.json({
    success: true,
    data: {
      marked: idsToMark.length,
      skipped,
      skippedReason: skipped > 0 ? 'Some payouts were already sent and were skipped.' : null,
    },
  })
}
