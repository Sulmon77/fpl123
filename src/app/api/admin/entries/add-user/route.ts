// src/app/api/admin/entries/add-user/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'
import { generatePin } from '@/lib/pin'

// POST /api/admin/entries/add-user
// Body: {
//   fplTeamId: number,
//   fplTeamName: string,
//   managerName: string,
//   paymentMethod: 'mpesa' | 'paypal' | 'manual',
//   paymentPhone?: string,
//   paymentEmail?: string,
//   notes?: string
// }
//
// Creates a confirmed entry as if the user paid through the system.
// Used for users who paid outside the system (cash, bank transfer, etc.)
export async function POST(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const supabase = createServerSupabaseClient()

  let body: {
    fplTeamId?: number
    fplTeamName?: string
    managerName?: string
    paymentMethod?: 'mpesa' | 'paypal' | 'manual'
    paymentPhone?: string
    paymentEmail?: string
    notes?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const { fplTeamId, fplTeamName, managerName, paymentMethod, paymentPhone, paymentEmail, notes } = body

  // Validate required fields
  if (!fplTeamId || !fplTeamName || !managerName || !paymentMethod) {
    return NextResponse.json({
      success: false,
      error: 'fplTeamId, fplTeamName, managerName, and paymentMethod are all required.',
    }, { status: 400 })
  }

  if (!['mpesa', 'paypal', 'manual'].includes(paymentMethod)) {
    return NextResponse.json({ success: false, error: 'paymentMethod must be mpesa, paypal, or manual.' }, { status: 400 })
  }

  // Get current gameweek from settings
  const { data: settings, error: settingsError } = await supabase
    .from('settings')
    .select('gameweek_number, entry_fee')
    .single()

  if (settingsError || !settings) {
    return NextResponse.json({ success: false, error: 'Could not load settings.' }, { status: 500 })
  }

  const gwNumber = settings.gameweek_number

  // Check for duplicate entry
  const { data: existing } = await supabase
    .from('entries')
    .select('id')
    .eq('fpl_team_id', fplTeamId)
    .eq('gameweek_number', gwNumber)
    .single()

  if (existing) {
    return NextResponse.json({
      success: false,
      error: `FPL Team ID ${fplTeamId} already has an entry for GW${gwNumber}.`,
    }, { status: 400 })
  }

  // Generate a PIN for this user
  const pin = generatePin()

  // Insert as confirmed entry
  const { data: newEntry, error: insertError } = await supabase
    .from('entries')
    .insert({
      fpl_team_id: fplTeamId,
      fpl_team_name: fplTeamName,
      manager_name: managerName,
      gameweek_number: gwNumber,
      payment_method: paymentMethod,
      payment_phone: paymentPhone ?? null,
      payment_email: paymentEmail ?? null,
      payment_status: 'confirmed',
      pin,
      pin_active: true,
      confirmed_at: new Date().toISOString(),
      notes: notes ?? 'Manually added by admin',
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    data: {
      entryId: newEntry.id,
      pin,
      managerName,
      fplTeamName,
      gameweekNumber: gwNumber,
      message: `${managerName} has been added to GW${gwNumber} as confirmed. Their PIN is ${pin}.`,
    },
  })
}
