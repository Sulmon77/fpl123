// src/app/api/admin/assign-groups/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { allocateGroups } from '@/lib/groups'
import { createServerSupabaseClient } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const supabase = createServerSupabaseClient()
  const { data: settings } = await supabase.from('settings').select('gameweek_number').single()

  if (!settings) {
    return NextResponse.json({ success: false, error: 'Settings not found.' }, { status: 500 })
  }

  logger.groups.info(`Admin triggered group allocation for GW${settings.gameweek_number}`, {
    file: 'src/app/api/admin/assign-groups/route.ts',
  })

  const result = await allocateGroups(settings.gameweek_number)

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true, data: result })
}
