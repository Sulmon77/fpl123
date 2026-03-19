// src/app/api/admin/entries/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const supabase = createServerSupabaseClient()

  // Support optional gameweek filter: /api/admin/entries?gw=22
  const { searchParams } = new URL(request.url)
  const gw = searchParams.get('gw')

  let query = supabase
    .from('entries')
    .select('*')
    .order('created_at', { ascending: false })

  if (gw) {
    query = query.eq('gameweek_number', parseInt(gw))
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
