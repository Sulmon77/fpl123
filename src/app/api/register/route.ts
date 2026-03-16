// src/app/api/register/route.ts
// Creates a pending entry record BEFORE payment
// Payment confirmation happens via M-Pesa callback or PayPal capture

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { generatePin } from '@/lib/pin'
import { validateMpesaPhone } from '@/lib/mpesa'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const file = 'src/app/api/register/route.ts'

  try {
    const body = await request.json()
    const {
      fplTeamId,
      fplTeamName,
      managerName,
      gameweekNumber,
      paymentMethod,
      paymentPhone,
      paymentEmail,
    } = body

    logger.db.info(`Creating entry for FPL ID: ${fplTeamId} GW${gameweekNumber}`, {
      file,
      function: 'POST /api/register',
      input: { fplTeamId, paymentMethod },
    })

    // Validate required fields
    if (!fplTeamId || !fplTeamName || !managerName || !gameweekNumber || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields.' },
        { status: 400 }
      )
    }

    if (!['mpesa', 'paypal'].includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment method.' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Get current settings
    const { data: settings } = await supabase
      .from('settings')
      .select('registration_open, gameweek_number')
      .single()

    if (!settings?.registration_open) {
      return NextResponse.json(
        { success: false, error: 'Registration is currently closed.' },
        { status: 403 }
      )
    }

    if (settings.gameweek_number !== gameweekNumber) {
      return NextResponse.json(
        { success: false, error: 'This gameweek is no longer accepting entries.' },
        { status: 400 }
      )
    }

    // Validate phone for M-Pesa
    let formattedPhone: string | undefined
    if (paymentMethod === 'mpesa') {
      if (!paymentPhone) {
        return NextResponse.json(
          { success: false, error: 'Phone number is required for M-Pesa.' },
          { status: 400 }
        )
      }
      const phoneValidation = validateMpesaPhone(paymentPhone)
      if (!phoneValidation.valid) {
        return NextResponse.json(
          { success: false, error: phoneValidation.error },
          { status: 400 }
        )
      }
      formattedPhone = phoneValidation.formatted

      // Check phone blacklist
      const { data: phoneBlacklisted } = await supabase
        .from('blacklist')
        .select('id')
        .eq('type', 'phone')
        .eq('value', formattedPhone!)
        .single()

      if (phoneBlacklisted) {
        return NextResponse.json(
          {
            success: false,
            error: 'This phone number is not permitted on this platform. Contact admin if you believe this is an error.',
            errorCode: 'BLACKLISTED',
          },
          { status: 403 }
        )
      }
    }

    // Validate PayPal email
    if (paymentMethod === 'paypal') {
      if (!paymentEmail) {
        return NextResponse.json(
          { success: false, error: 'Email is required for PayPal.' },
          { status: 400 }
        )
      }

      // Check PayPal email blacklist
      const { data: emailBlacklisted } = await supabase
        .from('blacklist')
        .select('id')
        .eq('type', 'paypal_email')
        .eq('value', paymentEmail.toLowerCase())
        .single()

      if (emailBlacklisted) {
        return NextResponse.json(
          {
            success: false,
            error: 'This PayPal email is not permitted on this platform. Contact admin if you believe this is an error.',
            errorCode: 'BLACKLISTED',
          },
          { status: 403 }
        )
      }
    }

    // Check if entry already exists (race condition prevention)
    const { data: existing } = await supabase
      .from('entries')
      .select('id, payment_status')
      .eq('fpl_team_id', fplTeamId)
      .eq('gameweek_number', gameweekNumber)
      .single()

    if (existing) {
      if (existing.payment_status === 'pending') {
        // Return existing pending entry
        return NextResponse.json({
          success: true,
          data: { entryId: existing.id, reusing: true },
        })
      }
      return NextResponse.json(
        { success: false, error: 'This FPL ID has already entered this gameweek.' },
        { status: 409 }
      )
    }

    // Generate PIN
    const pin = generatePin()

    // Create entry
    const { data: entry, error: insertError } = await supabase
      .from('entries')
      .insert({
        fpl_team_id: fplTeamId,
        fpl_team_name: fplTeamName,
        manager_name: managerName,
        gameweek_number: gameweekNumber,
        payment_method: paymentMethod,
        payment_phone: paymentMethod === 'mpesa' ? formattedPhone : null,
        payment_email: paymentMethod === 'paypal' ? paymentEmail?.toLowerCase() : null,
        payment_status: 'pending',
        pin,
        pin_active: true,
      })
      .select()
      .single()

    if (insertError) {
      logger.db.error(`Failed to create entry: ${insertError.message}`, {
        file,
        function: 'POST /api/register',
        input: { fplTeamId, gameweekNumber },
      })
      return NextResponse.json(
        { success: false, error: 'Failed to create entry. Please try again.' },
        { status: 500 }
      )
    }

    logger.db.success(`Entry created: ${entry.id} for FPL ID ${fplTeamId}`, { file })

    return NextResponse.json({
      success: true,
      data: {
        entryId: entry.id,
        paymentPhone: formattedPhone,
      },
    })
  } catch (err) {
    logger.db.error(`Unexpected error in register: ${String(err)}`, {
      file,
      function: 'POST /api/register',
      stack: err instanceof Error ? err.stack : undefined,
    })

    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
