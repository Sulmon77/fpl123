// src/app/api/admin/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.from('settings').select('*').single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  try {
    const body = await request.json()
    const supabase = createServerSupabaseClient()

    const allowed = [
      'gameweek_number', 'entry_fee', 'registration_open', 'giveaway_type',
      'giveaway_description', 'winners_per_group', 'payout_percentages',
      'standings_refresh_interval', 'hall_of_fame_enabled', 'hall_of_fame_price',
      'hall_of_fame_audience', 'announcement_text', 'announcement_visible',
      'terms_text', 'platform_name', 'history_visible', 'gameweek_status',
      'gameweek_ended', 'entry_deadline',
      // Tier settings
      'casual_settings', 'elite_settings',
    ]

    const update: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }

    update.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('settings')
      .update(update)
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (error) {
      logger.db.error(`Failed to update settings: ${error.message}`, {
        file: 'src/app/api/admin/settings/route.ts',
      })
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    logger.db.success('Admin settings updated', { file: 'src/app/api/admin/settings/route.ts' })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}