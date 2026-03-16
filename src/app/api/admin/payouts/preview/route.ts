// src/app/api/admin/payouts/preview/route.ts
// Builds a full preview of what payouts will look like

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'
import { calculateStandings } from '@/lib/groups'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const supabase = createServerSupabaseClient()

  const { data: settings } = await supabase
    .from('settings')
    .select('gameweek_number, entry_fee, winners_per_group, payout_percentages')
    .single()

  if (!settings) {
    return NextResponse.json({ success: false, error: 'Settings not found.' }, { status: 500 })
  }

  // Get all groups with members and entry details
  const { data: groups } = await supabase
    .from('groups')
    .select(`
      id, group_number,
      group_members (
        fpl_team_id, fpl_team_name, manager_name,
        gw_points, transfer_hits, chip_used, standing_position
      )
    `)
    .eq('gameweek_number', settings.gameweek_number)

  if (!groups?.length) {
    return NextResponse.json({ success: false, error: 'No groups found.' }, { status: 404 })
  }

  // Get payment details for each winner
  const { data: entries } = await supabase
    .from('entries')
    .select('fpl_team_id, payment_method, payment_phone, payment_email')
    .eq('gameweek_number', settings.gameweek_number)
    .eq('payment_status', 'confirmed')

  const entryMap = new Map(entries?.map(e => [e.fpl_team_id, e]) ?? [])

  const winners: Array<{
    groupNumber: number
    position: number
    fplTeamId: number
    managerName: string
    fplTeamName: string
    gwPoints: number
    chipUsed: string | null
    prizeAmount: number
    paymentMethod: string
    paymentDetail: string
  }> = []

  let totalPot = 0

  for (const group of groups) {
    const members = group.group_members ?? []
    const groupPot = members.length * settings.entry_fee
    totalPot += groupPot

    const platformCut = settings.payout_percentages?.platform ?? 10
    const distributablePot = Math.floor(groupPot * (1 - platformCut / 100))

    const positions = calculateStandings(members)

    for (const member of members) {
      const pos = positions.get(member.fpl_team_id) ?? 999
      if (pos > settings.winners_per_group) continue

      const pct = settings.payout_percentages?.[pos.toString()] ?? 0
      const amount = Math.floor(distributablePot * (pct / 100))

      const entry = entryMap.get(member.fpl_team_id)
      if (!entry) continue

      winners.push({
        groupNumber: group.group_number,
        position: pos,
        fplTeamId: member.fpl_team_id,
        managerName: member.manager_name,
        fplTeamName: member.fpl_team_name,
        gwPoints: member.gw_points,
        chipUsed: member.chip_used,
        prizeAmount: amount,
        paymentMethod: entry.payment_method,
        paymentDetail: entry.payment_method === 'mpesa'
          ? (entry.payment_phone ?? '—')
          : (entry.payment_email ?? '—'),
      })
    }
  }

  // Sort by group then position
  winners.sort((a, b) => a.groupNumber - b.groupNumber || a.position - b.position)

  const platformCutPct = settings.payout_percentages?.platform ?? 10
  const platformCut = Math.floor(totalPot * (platformCutPct / 100))
  const totalToDistribute = winners.reduce((sum, w) => sum + w.prizeAmount, 0)

  logger.payouts.info(`Payout preview: ${winners.length} winners, ${totalToDistribute} KES total`, {
    file: 'src/app/api/admin/payouts/preview/route.ts',
  })

  return NextResponse.json({
    success: true,
    data: {
      totalPot,
      platformCut,
      totalToDistribute,
      winners,
    },
  })
}
