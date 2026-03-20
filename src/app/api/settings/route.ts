// src/app/api/settings/route.ts
// Public settings endpoint — returns only safe, non-sensitive fields

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('settings')
    .select(`
      gameweek_number,
      entry_fee,
      entry_deadline,
      registration_open,
      giveaway_type,
      giveaway_description,
      winners_per_group,
      payout_percentages,
      casual_settings,
      elite_settings,
      hall_of_fame_enabled,
      hall_of_fame_audience,
      announcement_text,
      announcement_visible,
      terms_text,
      platform_name,
      history_visible,
      gameweek_status,
      gameweek_ended
    `)
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  // Append contact info from environment variables (safe to expose)
  const enriched = {
    ...data,
    contact_whatsapp: process.env.CONTACT_WHATSAPP ?? null,
    contact_instagram: process.env.CONTACT_INSTAGRAM ?? null,
    contact_email: process.env.CONTACT_EMAIL ?? null,
  }

  return NextResponse.json({ success: true, data: enriched })
}