// src/app/api/admin/groups/undo/route.ts
// Deletes all groups and group_members for the current gameweek

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const file = 'src/app/api/admin/groups/undo/route.ts'
  const supabase = createServerSupabaseClient()

  const { data: settings } = await supabase
    .from('settings')
    .select('gameweek_number')
    .single()

  if (!settings) {
    return NextResponse.json({ success: false, error: 'Settings not found.' }, { status: 500 })
  }

  const gw = settings.gameweek_number

  try {
    // Delete group_members first (foreign key child)
    const { error: membersError } = await supabase
      .from('group_members')
      .delete()
      .eq('gameweek_number', gw)

    if (membersError) {
      logger.groups.error(`Failed to delete group_members for GW${gw}: ${membersError.message}`, { file })
      return NextResponse.json({ success: false, error: membersError.message }, { status: 500 })
    }

    // Then delete groups (foreign key parent)
    const { error: groupsError } = await supabase
      .from('groups')
      .delete()
      .eq('gameweek_number', gw)

    if (groupsError) {
      logger.groups.error(`Failed to delete groups for GW${gw}: ${groupsError.message}`, { file })
      return NextResponse.json({ success: false, error: groupsError.message }, { status: 500 })
    }

    logger.groups.info(`Admin undid group allocation for GW${gw}`, { file })

    return NextResponse.json({ success: true, data: { gameweekNumber: gw } })
  } catch (err) {
    logger.groups.error(`Undo allocation error: ${String(err)}`, { file })
    return NextResponse.json({ success: false, error: 'Failed to undo allocation.' }, { status: 500 })
  }
}