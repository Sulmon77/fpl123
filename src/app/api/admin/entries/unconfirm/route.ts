// src/app/api/admin/entries/unconfirm/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'

// POST /api/admin/entries/unconfirm
// Body: { entryIds: string[] }
// Sets confirmed entries back to 'pending'. PIN stays active.
// Does NOT remove from groups (admin handles that separately if needed).
export async function POST(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const supabase = createServerSupabaseClient()

  let body: { entryIds?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const { entryIds } = body

  if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
    return NextResponse.json({ success: false, error: 'entryIds must be a non-empty array.' }, { status: 400 })
  }

  // Only unconfirm entries that are currently confirmed
  const { data: toUnconfirm, error: fetchError } = await supabase
    .from('entries')
    .select('id, manager_name, payment_status')
    .in('id', entryIds)
    .eq('payment_status', 'confirmed')

  if (fetchError) {
    return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 })
  }

  if (!toUnconfirm || toUnconfirm.length === 0) {
    return NextResponse.json({
      success: false,
      error: 'No confirmed entries found with those IDs.',
    }, { status: 400 })
  }

  const idsToUnconfirm = toUnconfirm.map(e => e.id)

  const { error: updateError } = await supabase
    .from('entries')
    .update({
      payment_status: 'pending',
      confirmed_at: null,
    })
    .in('id', idsToUnconfirm)

  if (updateError) {
    return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
  }

  const skipped = entryIds.length - idsToUnconfirm.length

  return NextResponse.json({
    success: true,
    data: {
      unconfirmed: idsToUnconfirm.length,
      skipped,
      skippedReason: skipped > 0 ? 'Some entries were not confirmed and were skipped.' : null,
    },
  })
}
