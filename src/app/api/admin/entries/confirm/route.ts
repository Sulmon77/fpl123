// src/app/api/admin/entries/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const { entryId } = await request.json()
  if (!entryId) return NextResponse.json({ success: false, error: 'Entry ID required.' }, { status: 400 })

  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('entries')
    .update({ payment_status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', entryId)

  if (error) {
    logger.db.error(`Failed to manually confirm entry ${entryId}: ${error.message}`, {
      file: 'src/app/api/admin/entries/confirm/route.ts',
    })
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  logger.db.success(`Entry ${entryId} manually confirmed by admin`, {
    file: 'src/app/api/admin/entries/confirm/route.ts',
  })

  return NextResponse.json({ success: true })
}
