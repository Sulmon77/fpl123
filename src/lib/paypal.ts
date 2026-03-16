// src/lib/paypal.ts
// PayPal REST API helpers
// Orders API (entry payments) + Payouts API (winner payments)

import { logger } from './logger'

const isSandbox = process.env.PAYPAL_ENVIRONMENT === 'sandbox'
const BASE_URL = isSandbox
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com'

// =============================================
// Get PayPal OAuth token
// =============================================
async function getPayPalToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID!
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  logger.paypal.info('Fetching OAuth token', { file: 'src/lib/paypal.ts', function: 'getPayPalToken' })

  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })

  if (!res.ok) {
    logger.paypal.error(`Failed to get PayPal token: HTTP ${res.status}`, {
      file: 'src/lib/paypal.ts',
      function: 'getPayPalToken',
    })
    throw new Error('PayPal authentication failed')
  }

  const data = await res.json()
  logger.paypal.success('OAuth token obtained', { file: 'src/lib/paypal.ts' })
  return data.access_token
}

// =============================================
// Create PayPal Order
// =============================================
export async function createPayPalOrder({
  amount,
  currency = 'USD',
  description,
  reference,
}: {
  amount: number
  currency?: string
  description: string
  reference: string
}): Promise<{ orderId: string; approvalUrl: string }> {
  const token = await getPayPalToken()

  logger.paypal.info(`Creating order for ${currency} ${amount}`, {
    file: 'src/lib/paypal.ts',
    function: 'createPayPalOrder',
    input: { amount, currency, reference },
  })

  const res = await fetch(`${BASE_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': reference,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: reference,
          description,
          amount: {
            currency_code: currency,
            value: amount.toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: 'FPL123',
        user_action: 'PAY_NOW',
      },
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    logger.paypal.error(`Failed to create order: ${data.message}`, {
      file: 'src/lib/paypal.ts',
      function: 'createPayPalOrder',
    })
    throw new Error(data.message || 'PayPal order creation failed')
  }

  const approvalUrl = data.links?.find((l: { rel: string; href: string }) => l.rel === 'approve')?.href || ''

  logger.paypal.success(`Order created: ${data.id}`, { file: 'src/lib/paypal.ts' })

  return { orderId: data.id, approvalUrl }
}

// =============================================
// Capture PayPal Order
// =============================================
export async function capturePayPalOrder(orderId: string): Promise<{
  success: boolean
  transactionId?: string
  status?: string
}> {
  const token = await getPayPalToken()

  logger.paypal.info(`Capturing order ${orderId}`, {
    file: 'src/lib/paypal.ts',
    function: 'capturePayPalOrder',
    input: { orderId },
  })

  const res = await fetch(`${BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  const data = await res.json()

  if (!res.ok || data.status !== 'COMPLETED') {
    logger.paypal.error(`Order capture failed: ${data.message || data.status}`, {
      file: 'src/lib/paypal.ts',
      function: 'capturePayPalOrder',
      input: { orderId },
    })
    return { success: false, status: data.status }
  }

  const captureId = data.purchase_units?.[0]?.payments?.captures?.[0]?.id

  logger.paypal.success(`Order captured: ${orderId} → capture ID: ${captureId}`, {
    file: 'src/lib/paypal.ts',
  })

  return { success: true, transactionId: captureId, status: 'COMPLETED' }
}

// =============================================
// PayPal Payout (B2C style, for winners)
// =============================================
export async function sendPayPalPayout({
  email,
  amount,
  currency = 'USD',
  note,
  senderItemId,
}: {
  email: string
  amount: number
  currency?: string
  note: string
  senderItemId: string
}): Promise<{ success: boolean; batchId?: string; error?: string }> {
  const token = await getPayPalToken()

  logger.paypal.info(`Sending payout to ${email} — ${currency} ${amount}`, {
    file: 'src/lib/paypal.ts',
    function: 'sendPayPalPayout',
    input: { email: email.replace(/(?<=.{3}).(?=.*@)/g, '*'), amount },
  })

  const batchId = `FPL123_${senderItemId}_${Date.now()}`

  const res = await fetch(`${BASE_URL}/v1/payments/payouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: batchId,
        email_subject: 'FPL123 Giveaway Payout',
        email_message: note,
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value: amount.toFixed(2),
            currency,
          },
          receiver: email,
          note,
          sender_item_id: senderItemId,
        },
      ],
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    logger.paypal.error(`Payout failed: ${data.message}`, {
      file: 'src/lib/paypal.ts',
      function: 'sendPayPalPayout',
    })
    return { success: false, error: data.message || 'Payout failed' }
  }

  logger.paypal.success(`Payout batch created: ${batchId}`, { file: 'src/lib/paypal.ts' })
  return { success: true, batchId }
}

// =============================================
// PayPal Refund
// =============================================
export async function refundPayPalCapture(
  captureId: string,
  amount?: number,
  currency = 'USD'
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  const token = await getPayPalToken()

  logger.paypal.info(`Refunding capture ${captureId}`, {
    file: 'src/lib/paypal.ts',
    function: 'refundPayPalCapture',
    input: { captureId, amount },
  })

  const body = amount
    ? { amount: { value: amount.toFixed(2), currency_code: currency } }
    : {}

  const res = await fetch(`${BASE_URL}/v2/payments/captures/${captureId}/refund`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()

  if (!res.ok) {
    logger.paypal.error(`Refund failed: ${data.message}`, {
      file: 'src/lib/paypal.ts',
      function: 'refundPayPalCapture',
    })
    return { success: false, error: data.message }
  }

  logger.paypal.success(`Refund processed: ${data.id}`, { file: 'src/lib/paypal.ts' })
  return { success: true, refundId: data.id }
}
