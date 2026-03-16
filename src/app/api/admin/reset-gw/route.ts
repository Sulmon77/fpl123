// src/app/api/admin/reset-gw/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const supabase = createServerSupabaseClient()
  const { data: settings } = await supabase.from('settings').select('gameweek_number').single()

  if (!settings) return NextResponse.json({ success: false, error: 'Settings not found.' }, { status: 500 })

  const gw = settings.gameweek_number

  logger.db.warn(`⚠️ Admin triggered GW${gw} data reset`, { file: 'src/app/api/admin/reset-gw/route.ts' })

  try {
    // Delete in order: group_members → groups → payouts → entries (for current GW)
    await supabase.from('group_members').delete().eq('gameweek_number', gw)
    await supabase.from('groups').delete().eq('gameweek_number', gw)
    await supabase.from('payouts').delete().eq('gameweek_number', gw)
    await supabase.from('entries').delete().eq('gameweek_number', gw)

    logger.db.success(`GW${gw} data reset complete`, { file: 'src/app/api/admin/reset-gw/route.ts' })
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.db.error(`GW reset failed: ${String(err)}`, { file: 'src/app/api/admin/reset-gw/route.ts' })
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
