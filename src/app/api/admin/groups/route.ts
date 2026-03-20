// src/app/api/admin/groups/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const supabase = createServerSupabaseClient()

  const { data: settings } = await supabase
    .from('settings')
    .select('gameweek_number')
    .single()

  const { data, error } = await supabase
    .from('groups')
    .select(`
      id,
      group_number,
      gameweek_number,
      entry_tier,
      allocated_at,
      group_members (
        id,
        fpl_team_id,
        fpl_team_name,
        manager_name,
        entry_tier,
        gw_points,
        transfer_hits,
        chip_used,
        standing_position,
        prize_amount
      )
    `)
    .eq('gameweek_number', settings?.gameweek_number ?? 1)
    .order('group_number')

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  const enriched = (data ?? []).map(group => ({
    ...group,
    // Ensure entry_tier always has a value — fall back to group_members tier if somehow missing
    entry_tier: group.entry_tier ??
      (Array.isArray(group.group_members) && group.group_members.length > 0
        ? group.group_members[0].entry_tier
        : 'casual'),
    member_count: Array.isArray(group.group_members) ? group.group_members.length : 0,
  }))

  return NextResponse.json({ success: true, data: enriched })
}