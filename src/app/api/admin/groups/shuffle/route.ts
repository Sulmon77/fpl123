// src/app/api/admin/groups/shuffle/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'
import { allocateGroups } from '@/lib/groups'
import { logger } from '@/lib/logger'
import type { EntryTier } from '@/types'

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

  // Optional tier filter
  let tier: EntryTier | undefined
  try {
    const body = await request.json().catch(() => ({}))
    if (body?.tier === 'casual' || body?.tier === 'elite') {
      tier = body.tier as EntryTier
    }
  } catch { /* no body */ }

  try {
    // Delete group_members for the specified tier (or all)
    let membersQuery = supabase
      .from('group_members')
      .delete()
      .eq('gameweek_number', gw)

    if (tier) {
      membersQuery = membersQuery.eq('entry_tier', tier) as typeof membersQuery
    }

    const { error: membersError } = await membersQuery
    if (membersError) {
      logger.groups.error(`Shuffle: failed to delete group_members: ${membersError.message}`, { file })
      return NextResponse.json({ success: false, error: membersError.message }, { status: 500 })
    }

    // Delete groups
    let groupsQuery = supabase
      .from('groups')
      .delete()
      .eq('gameweek_number', gw)

    if (tier) {
      groupsQuery = groupsQuery.eq('entry_tier', tier) as typeof groupsQuery
    }

    const { error: groupsError } = await groupsQuery
    if (groupsError) {
      logger.groups.error(`Shuffle: failed to delete groups: ${groupsError.message}`, { file })
      return NextResponse.json({ success: false, error: groupsError.message }, { status: 500 })
    }

    const result = await allocateGroups(gw, tier)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    logger.groups.info(
      `Admin shuffled ${tier ?? 'all'} groups for GW${gw}: ${result.groupCount} groups`,
      { file }
    )

    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    logger.groups.error(`Shuffle error: ${String(err)}`, { file })
    return NextResponse.json({ success: false, error: 'Failed to shuffle groups.' }, { status: 500 })
  }
}