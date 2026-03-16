// src/app/api/settings/route.ts
// Public settings endpoint — returns non-sensitive platform settings

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    const { data: settings, error } = await supabase
      .from('settings')
      .select(
        'gameweek_number, entry_fee, entry_deadline, registration_open, gameweek_status, gameweek_ended, ' +
        'giveaway_type, giveaway_description, winners_per_group, payout_percentages, ' +
        'hall_of_fame_enabled, hall_of_fame_price, hall_of_fame_audience, ' +
        'standings_refresh_interval, announcement_text, announcement_visible, ' +
        'terms_text, platform_name, history_visible'
      )
      .single()

    if (error || !settings) {
      return NextResponse.json(
        { success: false, error: 'Failed to load settings.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: settings })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: 'Internal error.' },
      { status: 500 }
    )
  }
}