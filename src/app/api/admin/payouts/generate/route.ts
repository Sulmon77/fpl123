// src/app/api/admin/payouts/generate/route.ts
// Creates payout records in the DB for all winners of the current GW

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'
import { calculateStandings } from '@/lib/groups'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const file = 'src/app/api/admin/payouts/generate/route.ts'
  const supabase = createServerSupabaseClient()

  try {
    // 1. Fetch settings
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('gameweek_number, winners_per_group, payout_percentages, entry_fee')
      .single()

    if (settingsError || !settings) {
      return NextResponse.json({ success: false, error: 'Settings not found.' }, { status: 500 })
    }

    const { gameweek_number: gw, winners_per_group, payout_percentages, entry_fee } = settings

    // 2. Fetch all groups with their members
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select(`
        id, group_number,
        group_members (
          fpl_team_id, fpl_team_name, manager_name,
          gw_points, transfer_hits, chip_used, standing_position
        )
      `)
      .eq('gameweek_number', gw)

    if (groupsError || !groups?.length) {
      return NextResponse.json({ success: false, error: 'No groups found for current GW.' }, { status: 404 })
    }

    // 3. Fetch all confirmed entries for payment details
    const { data: entries } = await supabase
      .from('entries')
      .select('fpl_team_id, payment_method, payment_phone, payment_email')
      .eq('gameweek_number', gw)
      .eq('payment_status', 'confirmed')

    const entryMap = new Map((entries ?? []).map(e => [e.fpl_team_id, e]))

    // 4. Fetch existing payout records to avoid duplicates
    const { data: existingPayouts } = await supabase
      .from('payouts')
      .select('fpl_team_id')
      .eq('gameweek_number', gw)

    const existingSet = new Set((existingPayouts ?? []).map(p => p.fpl_team_id))

    let created = 0
    let skipped = 0

    const platformCutPct = payout_percentages?.platform ?? 10

    // 5. Loop through each group and find winners
    for (const group of groups) {
      const members = group.group_members ?? []
      const groupPot = members.length * entry_fee
      const distributable = Math.floor(groupPot * (1 - platformCutPct / 100))

      const positions = calculateStandings(members)

      for (const member of members) {
        const pos = positions.get(member.fpl_team_id) ?? 999
        if (pos > winners_per_group) continue

        // Skip if payout record already exists
        if (existingSet.has(member.fpl_team_id)) {
          skipped++
          continue
        }

        const pct = payout_percentages?.[pos.toString()] ?? 0
        const amount = Math.floor(distributable * (pct / 100))

        const entry = entryMap.get(member.fpl_team_id)
        if (!entry) {
          logger.payouts.warn(
            `No entry found for fpl_team_id ${member.fpl_team_id} in GW${gw} — skipping`,
            { file }
          )
          skipped++
          continue
        }

        const paymentDetail =
          entry.payment_method === 'mpesa'
            ? (entry.payment_phone ?? '')
            : (entry.payment_email ?? '')

        const { error: insertError } = await supabase.from('payouts').insert({
          gameweek_number: gw,
          fpl_team_id: member.fpl_team_id,
          manager_name: member.manager_name,
          fpl_team_name: member.fpl_team_name,
          group_number: group.group_number,
          position: pos,
          amount,
          payment_method: entry.payment_method,
          payment_detail: paymentDetail,
          status: 'pending',
        })

        if (insertError) {
          logger.payouts.error(
            `Failed to insert payout for ${member.manager_name}: ${insertError.message}`,
            { file }
          )
          skipped++
        } else {
          created++
        }
      }
    }

    logger.payouts.info(`Generated payouts for GW${gw}: ${created} created, ${skipped} skipped`, { file })

    return NextResponse.json({
      success: true,
      data: { created, skipped },
    })
  } catch (err) {
    logger.payouts.error(`Generate payouts error: ${String(err)}`, { file })
    return NextResponse.json({ success: false, error: 'Failed to generate payout records.' }, { status: 500 })
  }
}