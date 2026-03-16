// src/app/api/admin/blacklist/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('blacklist')
    .select('*')
    .order('added_at', { ascending: false })

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function POST(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const { type, value, reason } = await request.json()

  if (!type || !value) {
    return NextResponse.json({ success: false, error: 'Type and value required.' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from('blacklist').insert({
    type,
    value: value.toString().trim().toLowerCase(),
    reason: reason || null,
  })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'This value is already blacklisted.' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  logger.db.info(`Blacklisted ${type}: ${value}. Reason: ${reason}`, {
    file: 'src/app/api/admin/blacklist/route.ts',
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const { id } = await request.json()
  if (!id) return NextResponse.json({ success: false, error: 'ID required.' }, { status: 400 })

  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from('blacklist').delete().eq('id', id)

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  logger.db.info(`Blacklist entry ${id} removed`, { file: 'src/app/api/admin/blacklist/route.ts' })
  return NextResponse.json({ success: true })
}
