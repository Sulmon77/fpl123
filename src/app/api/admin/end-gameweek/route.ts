// src/app/api/admin/end-gameweek/route.ts
// Sets gameweek_ended = true and closes registration

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const file = 'src/app/api/admin/end-gameweek/route.ts'
  const supabase = createServerSupabaseClient()

  try {
    // Read current settings
    const { data: settings, error: readError } = await supabase
      .from('settings')
      .select('id, gameweek_number, gameweek_ended')
      .single()

    if (readError || !settings) {
      return NextResponse.json({ success: false, error: 'Settings not found.' }, { status: 500 })
    }

    if (settings.gameweek_ended) {
      return NextResponse.json(
        { success: false, error: 'Gameweek is already ended.' },
        { status: 400 }
      )
    }

    // Mark gameweek as ended and close registration
    const { error: updateError } = await supabase
      .from('settings')
      .update({
        gameweek_ended: true,
        registration_open: false,
      })
      .eq('id', settings.id)

    if (updateError) {
      logger.groups.error(`Failed to end gameweek: ${updateError.message}`, { file })
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    logger.groups.info(`Admin ended GW${settings.gameweek_number}`, { file })

    return NextResponse.json({
      success: true,
      data: { gameweekNumber: settings.gameweek_number },
    })
  } catch (err) {
    logger.groups.error(`End gameweek error: ${String(err)}`, { file })
    return NextResponse.json({ success: false, error: 'Failed to end gameweek.' }, { status: 500 })
  }
}