// src/app/api/admin/payouts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const supabase = createServerSupabaseClient()
  const { data: settings } = await supabase.from('settings').select('gameweek_number').single()

  const { data, error } = await supabase
    .from('payouts')
    .select('*')
    .eq('gameweek_number', settings?.gameweek_number ?? 1)
    .order('position')

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
