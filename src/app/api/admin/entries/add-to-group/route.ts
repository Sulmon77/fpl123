// src/app/api/admin/entries/add-to-group/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'

// POST /api/admin/entries/add-to-group
// Body: {
//   entryId: string,       — the entry to add
//   groupId?: string,      — specific group ID (optional — if omitted, assigns randomly)
// }
//
// Rules:
//  - Groups must already be allocated
//  - Target group must have fewer than 32 members
//  - Entry must be confirmed
//  - Entry must not already be in a group this GW
export async function POST(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const supabase = createServerSupabaseClient()

  let body: { entryId?: string; groupId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const { entryId, groupId } = body

  if (!entryId) {
    return NextResponse.json({ success: false, error: 'entryId is required.' }, { status: 400 })
  }

  // Fetch the entry
  const { data: entry, error: entryError } = await supabase
    .from('entries')
    .select('*')
    .eq('id', entryId)
    .single()

  if (entryError || !entry) {
    return NextResponse.json({ success: false, error: 'Entry not found.' }, { status: 404 })
  }

  if (entry.payment_status !== 'confirmed') {
    return NextResponse.json({
      success: false,
      error: 'Entry must be confirmed before adding to a group.',
    }, { status: 400 })
  }

  const gwNumber = entry.gameweek_number

  // Check entry is not already in a group
  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('fpl_team_id', entry.fpl_team_id)
    .eq('gameweek_number', gwNumber)
    .single()

  if (existing) {
    return NextResponse.json({
      success: false,
      error: `${entry.manager_name} is already in a group for GW${gwNumber}.`,
    }, { status: 400 })
  }

  // Find the target group
  let targetGroupId = groupId

  if (targetGroupId) {
    // Verify the specified group exists and has space
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, group_number')
      .eq('id', targetGroupId)
      .eq('gameweek_number', gwNumber)
      .single()

    if (groupError || !group) {
      return NextResponse.json({
        success: false,
        error: 'Specified group not found for this gameweek.',
      }, { status: 404 })
    }

    // Check group size
    const { count } = await supabase
      .from('group_members')
      .select('id', { count: 'exact' })
      .eq('group_id', targetGroupId)

    if ((count ?? 0) >= 32) {
      return NextResponse.json({
        success: false,
        error: `Group ${group.group_number} is full (32/32 members). Choose a different group.`,
      }, { status: 400 })
    }
  } else {
    // Assign randomly to a group with space
    const { data: allGroups, error: groupsError } = await supabase
      .from('groups')
      .select('id, group_number')
      .eq('gameweek_number', gwNumber)

    if (groupsError || !allGroups || allGroups.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No groups found for this gameweek. Run group allocation first.',
      }, { status: 400 })
    }

    // Find groups with fewer than 32 members
    const availableGroups: { id: string; group_number: number }[] = []

    for (const group of allGroups) {
      const { count } = await supabase
        .from('group_members')
        .select('id', { count: 'exact' })
        .eq('group_id', group.id)

      if ((count ?? 0) < 32) {
        availableGroups.push(group)
      }
    }

    if (availableGroups.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'All groups are full (32 members each). Cannot add more users.',
      }, { status: 400 })
    }

    // Pick a random available group
    const randomGroup = availableGroups[Math.floor(Math.random() * availableGroups.length)]
    targetGroupId = randomGroup.id
  }

  // Fetch group info for response
  const { data: targetGroup } = await supabase
    .from('groups')
    .select('group_number')
    .eq('id', targetGroupId)
    .single()

  // Add to group_members
  const { error: insertError } = await supabase
    .from('group_members')
    .insert({
      group_id: targetGroupId,
      fpl_team_id: entry.fpl_team_id,
      fpl_team_name: entry.fpl_team_name,
      manager_name: entry.manager_name,
      gameweek_number: gwNumber,
      gw_points: 0,
      transfer_hits: 0,
      chip_used: null,
      standing_position: null,
      prize_amount: 0,
    })

  if (insertError) {
    return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    data: {
      managerName: entry.manager_name,
      groupNumber: targetGroup?.group_number,
      groupId: targetGroupId,
      gameweekNumber: gwNumber,
      message: `${entry.manager_name} has been added to Group ${targetGroup?.group_number}.`,
    },
  })
}
