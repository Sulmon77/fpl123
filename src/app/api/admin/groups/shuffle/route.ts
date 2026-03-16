// src/app/api/admin/groups/shuffle/route.ts
// Deletes existing groups for the current GW and reallocates fresh random groups

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'
import { allocateGroups } from '@/lib/groups'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const file = 'src/app/api/admin/groups/shuffle/route.ts'
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
    // Step 1 — delete existing group_members (child first)
    const { error: membersError } = await supabase
      .from('group_members')
      .delete()
      .eq('gameweek_number', gw)

    if (membersError) {
      logger.groups.error(`Shuffle: failed to delete group_members for GW${gw}: ${membersError.message}`, { file })
      return NextResponse.json({ success: false, error: membersError.message }, { status: 500 })
    }

    // Step 2 — delete existing groups (parent)
    const { error: groupsError } = await supabase
      .from('groups')
      .delete()
      .eq('gameweek_number', gw)

    if (groupsError) {
      logger.groups.error(`Shuffle: failed to delete groups for GW${gw}: ${groupsError.message}`, { file })
      return NextResponse.json({ success: false, error: groupsError.message }, { status: 500 })
    }

    // Step 3 — reallocate fresh random groups
    const result = await allocateGroups(gw)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    logger.groups.info(`Admin shuffled groups for GW${gw}: ${result.groupCount} groups`, { file })

    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    logger.groups.error(`Shuffle error: ${String(err)}`, { file })
    return NextResponse.json({ success: false, error: 'Failed to shuffle groups.' }, { status: 500 })
  }
}