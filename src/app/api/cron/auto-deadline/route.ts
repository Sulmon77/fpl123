// src/app/api/cron/auto-deadline/route.ts
// Runs hourly — fetches GW deadline from FPL API and updates settings

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentGwDeadline } from '@/lib/fpl'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets this header for cron jobs)
  const authHeader = request.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  logger.cron.info('Running auto-deadline cron job', {
    file: 'src/app/api/cron/auto-deadline/route.ts',
    function: 'GET /api/cron/auto-deadline',
  })

  try {
    const result = await getCurrentGwDeadline()

    if (!result) {
      logger.cron.error('Could not fetch deadline from FPL API', {
        file: 'src/app/api/cron/auto-deadline/route.ts',
      })
      return NextResponse.json({ success: false, error: 'FPL API unavailable' })
    }

    const supabase = createServerSupabaseClient()

    await supabase
      .from('settings')
      .update({
        entry_deadline: result.deadline,
        updated_at: new Date().toISOString(),
      })
      .neq('id', '00000000-0000-0000-0000-000000000000')

    logger.cron.success(
      `[CRON AUTO-DEADLINE] GW${result.gwNumber} deadline set to ${result.deadline}`,
      { file: 'src/app/api/cron/auto-deadline/route.ts' }
    )

    return NextResponse.json({ success: true, gwNumber: result.gwNumber, deadline: result.deadline })
  } catch (err) {
    logger.cron.error(`Auto-deadline cron failed: ${String(err)}`, {
      file: 'src/app/api/cron/auto-deadline/route.ts',
      function: 'GET /api/cron/auto-deadline',
    })
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
