// src/app/api/cron/auto-groups/route.ts
// Runs every 5 minutes — allocates groups after GW deadline if not yet done

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { allocateGroups } from '@/lib/groups'
import { isDeadlinePassed } from '@/lib/utils'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  logger.cron.info('Running auto-groups cron job', {
    file: 'src/app/api/cron/auto-groups/route.ts',
  })

  try {
    const supabase = createServerSupabaseClient()

    const { data: settings } = await supabase
      .from('settings')
      .select('gameweek_number, entry_deadline, registration_open')
      .single()

    if (!settings) {
      logger.cron.warn('No settings found', { file: 'src/app/api/cron/auto-groups/route.ts' })
      return NextResponse.json({ success: false, reason: 'No settings' })
    }

    // Check conditions for allocation:
    // 1. Deadline must have passed
    // 2. Registration was open (managers had a chance to enter)
    // 3. Groups not yet allocated

    if (!settings.entry_deadline || !isDeadlinePassed(settings.entry_deadline)) {
      logger.cron.info('Deadline not yet passed — skipping group allocation', {
        file: 'src/app/api/cron/auto-groups/route.ts',
      })
      return NextResponse.json({ success: true, reason: 'Deadline not passed' })
    }

    // Check if groups already exist
    const { data: existingGroups } = await supabase
      .from('groups')
      .select('id')
      .eq('gameweek_number', settings.gameweek_number)
      .limit(1)

    if (existingGroups && existingGroups.length > 0) {
      logger.cron.info(`Groups already allocated for GW${settings.gameweek_number}`, {
        file: 'src/app/api/cron/auto-groups/route.ts',
      })
      return NextResponse.json({ success: true, reason: 'Already allocated' })
    }

    // Allocate groups
    const result = await allocateGroups(settings.gameweek_number)

    if (result.success) {
      // Close registration after allocation
      await supabase
        .from('settings')
        .update({ registration_open: false })
        .neq('id', '00000000-0000-0000-0000-000000000000')

      logger.cron.success(
        `[CRON AUTO-GROUPS] Allocated ${result.memberCount} managers into ${result.groupCount} groups for GW${settings.gameweek_number}`,
        { file: 'src/app/api/cron/auto-groups/route.ts' }
      )
    }

    return NextResponse.json({ success: result.success, data: result })
  } catch (err) {
    logger.cron.error(`Auto-groups cron failed: ${String(err)}`, {
      file: 'src/app/api/cron/auto-groups/route.ts',
    })
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
