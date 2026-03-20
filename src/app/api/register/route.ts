// src/app/api/register/route.ts
// Creates a pending entry record BEFORE payment
// Payment confirmation happens via M-Pesa callback

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { generatePin } from '@/lib/pin'
import { validateMpesaPhone } from '@/lib/mpesa'
import { logger } from '@/lib/logger'
import type { EntryTier, TierSettings } from '@/types'

export async function POST(request: NextRequest) {
  const file = 'src/app/api/register/route.ts'

  try {
    const body = await request.json()
    const {
      fplTeamId,
      fplTeamName,
      managerName,
      gameweekNumber,
      entryTier,
      paymentMethod,
      paymentPhone,
      paymentEmail,
    } = body

    logger.db.info(`Register attempt FPL ID: ${fplTeamId} GW${gameweekNumber} tier:${entryTier}`, {
      file,
      function: 'POST /api/register',
      input: { fplTeamId, paymentMethod, entryTier },
    })

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

    const tier: EntryTier = entryTier === 'elite' ? 'elite' : 'casual'
    const supabase = createServerSupabaseClient()

    // Get current settings
    const { data: settings } = await supabase
      .from('settings')
      .select('registration_open, gameweek_number, casual_settings, elite_settings')
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

    // Validate tier is enabled
    const tierSettings: TierSettings = tier === 'elite'
      ? (settings.elite_settings as TierSettings)
      : (settings.casual_settings as TierSettings)

    if (!tierSettings?.enabled) {
      return NextResponse.json(
        { success: false, error: `${tier === 'elite' ? 'Elite' : 'Casual'} entries are currently disabled.` },
        { status: 403 }
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

    if (paymentMethod === 'paypal' && paymentEmail) {
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
            error: 'This PayPal email is not permitted on this platform.',
            errorCode: 'BLACKLISTED',
          },
          { status: 403 }
        )
      }
    }

    // Check for any existing entry for this FPL ID + GW (any tier, any status)
    const { data: existing } = await supabase
      .from('entries')
      .select('id, payment_status, entry_tier, pin')
      .eq('fpl_team_id', fplTeamId)
      .eq('gameweek_number', gameweekNumber)
      .single()

    if (existing) {
      if (existing.payment_status === 'confirmed') {
        // Already paid and confirmed — tell the front-end so it can redirect to standings
        return NextResponse.json(
          {
            success: false,
            error: 'You have already entered this gameweek.',
            errorCode: 'ALREADY_CONFIRMED',
            data: { entryTier: existing.entry_tier },
          },
          { status: 409 }
        )
      }

      if (existing.payment_status === 'pending') {
        if (existing.entry_tier === tier) {
          // Same tier pending — reuse the existing entry so the payment flow continues
          logger.db.info(`Reusing existing pending entry ${existing.id} for FPL ID ${fplTeamId}`, { file })
          return NextResponse.json({
            success: true,
            data: { entryId: existing.id, reusing: true },
          })
        } else {
          // Different tier pending — delete the stale pending entry and create a fresh one
          // (user changed their mind about tier before paying)
          logger.db.info(`Deleting stale pending ${existing.entry_tier} entry ${existing.id} to allow ${tier} entry`, { file })
          await supabase.from('entries').delete().eq('id', existing.id)
          // Falls through to create new entry below
        }
      }

      if (existing.payment_status === 'refunded') {
        // Allow re-entry after refund — fall through to create new entry
        // (The unique constraint won't fire because the old row exists with refunded status)
        // We need to delete the old refunded row first
        await supabase.from('entries').delete().eq('id', existing.id)
      }
    }

    // Create new entry
    const pin = generatePin()

    const { data: entry, error: insertError } = await supabase
      .from('entries')
      .insert({
        fpl_team_id: fplTeamId,
        fpl_team_name: fplTeamName,
        manager_name: managerName,
        gameweek_number: gameweekNumber,
        entry_tier: tier,
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
      logger.db.error(`Failed to create entry: ${insertError.message}`, { file })
      return NextResponse.json(
        { success: false, error: 'Failed to create entry. Please try again.' },
        { status: 500 }
      )
    }

    logger.db.success(`Entry created: ${entry.id} for FPL ID ${fplTeamId} tier:${tier}`, { file })

    return NextResponse.json({
      success: true,
      data: {
        entryId: entry.id,
        paymentPhone: formattedPhone,
      },
    })
  } catch (err) {
    logger.db.error(`Unexpected error in register: ${String(err)}`, { file })
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}