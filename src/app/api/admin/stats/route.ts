// src/app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const supabase = createServerSupabaseClient()

  const [settingsRes, entriesRes, groupsRes] = await Promise.all([
    supabase.from('settings').select('gameweek_number, entry_fee, registration_open, entry_deadline').single(),
    supabase.from('entries').select('id, payment_status'),
    supabase.from('groups').select('id'),
  ])

  const settings = settingsRes.data
  const entries = entriesRes.data ?? []
  const confirmed = entries.filter(e => e.payment_status === 'confirmed')
  const pending = entries.filter(e => e.payment_status === 'pending')

  return NextResponse.json({
    success: true,
    data: {
      totalEntries: entries.length,
      confirmedEntries: confirmed.length,
      pendingEntries: pending.length,
      totalRevenueKes: confirmed.length * (settings?.entry_fee ?? 200),
      groupsAllocated: groupsRes.data?.length ?? 0,
      currentGw: settings?.gameweek_number,
      registrationOpen: settings?.registration_open,
      deadline: settings?.entry_deadline,
    },
  })
}
