// src/app/api/admin/entries/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const supabase = createServerSupabaseClient()

  const { searchParams } = new URL(request.url)
  const gw = searchParams.get('gw')
  const tier = searchParams.get('tier')           // 'casual' | 'elite' | null (all)
  const includePending = searchParams.get('include_pending') === 'true'

  let query = supabase
    .from('entries')
    .select('*')
    .order('created_at', { ascending: false })

  if (gw) {
    query = query.eq('gameweek_number', parseInt(gw))
  }

  if (tier && (tier === 'casual' || tier === 'elite')) {
    query = query.eq('entry_tier', tier)
  }

  // By default hide pending entries from admin view.
  // Pass include_pending=true to see them (e.g. for debugging).
  if (!includePending) {
    query = query.neq('payment_status', 'pending')
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}