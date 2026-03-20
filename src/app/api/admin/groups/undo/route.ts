// src/app/api/admin/groups/undo/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin-auth'
import { createServerSupabaseClient } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { EntryTier } from '@/types'

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

  let tier: EntryTier | undefined
  try {
    const body = await request.json().catch(() => ({}))
    if (body?.tier === 'casual' || body?.tier === 'elite') {
      tier = body.tier as EntryTier
    }
  } catch { /* no body */ }

  try {
    let membersQuery = supabase
      .from('group_members')
      .delete()
      .eq('gameweek_number', gw)

    if (tier) {
      membersQuery = membersQuery.eq('entry_tier', tier) as typeof membersQuery
    }

    const { error: membersError } = await membersQuery
    if (membersError) {
      logger.groups.error(`Undo: failed to delete group_members: ${membersError.message}`, { file })
      return NextResponse.json({ success: false, error: membersError.message }, { status: 500 })
    }

    let groupsQuery = supabase
      .from('groups')
      .delete()
      .eq('gameweek_number', gw)

    if (tier) {
      groupsQuery = groupsQuery.eq('entry_tier', tier) as typeof groupsQuery
    }

    const { error: groupsError } = await groupsQuery
    if (groupsError) {
      logger.groups.error(`Undo: failed to delete groups: ${groupsError.message}`, { file })
      return NextResponse.json({ success: false, error: groupsError.message }, { status: 500 })
    }

    logger.groups.info(`Admin undid ${tier ?? 'all'} group allocation for GW${gw}`, { file })
    return NextResponse.json({ success: true, data: { gameweekNumber: gw, tier: tier ?? 'all' } })
  } catch (err) {
    logger.groups.error(`Undo error: ${String(err)}`, { file })
    return NextResponse.json({ success: false, error: 'Failed to undo allocation.' }, { status: 500 })
  }
}