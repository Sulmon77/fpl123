// src/app/api/admin/pin/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'
import { generatePin, isValidPin } from '@/lib/pin'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const { entryId, action, newPin } = await request.json()
  const supabase = createServerSupabaseClient()

  if (action === 'revoke') {
    const { data: entry } = await supabase
      .from('entries')
      .select('pin_active')
      .eq('id', entryId)
      .single()

    const { error } = await supabase
      .from('entries')
      .update({ pin_active: !entry?.pin_active })
      .eq('id', entryId)

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

    logger.auth.info(`PIN ${entry?.pin_active ? 'revoked' : 'restored'} for entry ${entryId}`, {
      file: 'src/app/api/admin/pin/route.ts',
    })
    return NextResponse.json({ success: true })
  }

  if (action === 'update') {
    const pin = newPin || generatePin()
    if (!isValidPin(pin)) return NextResponse.json({ success: false, error: 'Invalid PIN format.' }, { status: 400 })

    const { error } = await supabase.from('entries').update({ pin }).eq('id', entryId)
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, data: { pin } })
  }

  return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400 })
}
