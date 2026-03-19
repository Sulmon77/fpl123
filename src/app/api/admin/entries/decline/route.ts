// src/app/api/admin/entries/decline/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'

// POST /api/admin/entries/decline
// Body: { entryIds: string[] }
// Deletes entries only if their payment_status is 'pending' (no money taken).
// Confirmed or refunded entries are skipped — use Refund for those.
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

  // Only delete entries that are still pending (no money taken)
  const { data: toDelete, error: fetchError } = await supabase
    .from('entries')
    .select('id, manager_name, payment_status')
    .in('id', entryIds)
    .eq('payment_status', 'pending')

  if (fetchError) {
    return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 })
  }

  if (!toDelete || toDelete.length === 0) {
    return NextResponse.json({
      success: false,
      error: 'No pending entries found with those IDs. Only pending entries (no payment taken) can be declined.',
    }, { status: 400 })
  }

  const idsToDelete = toDelete.map(e => e.id)

  const { error: deleteError } = await supabase
    .from('entries')
    .delete()
    .in('id', idsToDelete)

  if (deleteError) {
    return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 })
  }

  const skipped = entryIds.length - idsToDelete.length

  return NextResponse.json({
    success: true,
    data: {
      declined: idsToDelete.length,
      skipped,
      skippedReason: skipped > 0 ? 'Some entries were not pending (already confirmed or refunded) and were skipped.' : null,
    },
  })
}
