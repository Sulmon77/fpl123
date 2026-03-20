// src/app/api/admin/stats/route.ts
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

  const currentGw = settings?.gameweek_number ?? 1

  // All confirmed, non-disqualified entries for current GW
  const { data: entries } = await supabase
    .from('entries')
    .select('id, payment_status, entry_tier, disqualified')
    .eq('gameweek_number', currentGw)

  const allEntries = entries ?? []
  const confirmedEntries = allEntries.filter(
    e => e.payment_status === 'confirmed' && !e.disqualified
  )

  const casualEntries = confirmedEntries.filter(e => e.entry_tier === 'casual').length
  const eliteEntries = confirmedEntries.filter(e => e.entry_tier === 'elite').length

  return NextResponse.json({
    success: true,
    data: {
      confirmedEntries: confirmedEntries.length,
      pendingEntries: allEntries.filter(e => e.payment_status === 'pending').length,
      casualEntries,
      eliteEntries,
      currentGw,
    },
  })
}