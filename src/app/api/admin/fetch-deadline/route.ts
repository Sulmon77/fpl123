// src/app/api/admin/fetch-deadline/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getCurrentGwDeadline } from '@/lib/fpl'
import { requireAdminAuth } from '@/lib/admin-auth'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  try {
    const result = await getCurrentGwDeadline()

    if (!result) {
      return NextResponse.json({ success: false, error: 'Could not fetch deadline from FPL API.' }, { status: 500 })
    }

    // Update settings
    const supabase = createServerSupabaseClient()
    await supabase
      .from('settings')
      .update({ entry_deadline: result.deadline, updated_at: new Date().toISOString() })
      .neq('id', '00000000-0000-0000-0000-000000000000')

    logger.cron.success(`[CRON AUTO-DEADLINE] GW${result.gwNumber} deadline set to ${result.deadline}`, {
      file: 'src/app/api/admin/fetch-deadline/route.ts',
    })

    return NextResponse.json({ success: true, data: { deadline: result.deadline, gwNumber: result.gwNumber } })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
