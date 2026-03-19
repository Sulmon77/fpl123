// src/lib/mpesa.ts
// M-Pesa Daraja API helpers
// STK Push (entry payments) + B2C (payouts)

import { logger } from './logger'

const isSandbox = process.env.MPESA_ENVIRONMENT === 'sandbox'
const BASE_URL = isSandbox
  ? 'https://sandbox.safaricom.co.ke'
  : 'https://api.safaricom.co.ke'

// =============================================
// Get OAuth token
// =============================================
async function getMpesaToken(): Promise<string> {
  const consumerKey = process.env.MPESA_CONSUMER_KEY!
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET!
  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')

  logger.mpesa.info('Fetching OAuth token', { file: 'src/lib/mpesa.ts', function: 'getMpesaToken' })

  const res = await fetch(
    `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
      cache: 'no-store',
    }
  )

  if (!res.ok) {
    logger.mpesa.error(`Failed to get token: HTTP ${res.status}`, {
      file: 'src/lib/mpesa.ts',
      function: 'getMpesaToken',
    })
    throw new Error('M-Pesa authentication failed')
  }

  const data = await res.json()

  if (!data.access_token) {
    logger.mpesa.error('No access token in response', { file: 'src/lib/mpesa.ts' })
    throw new Error('M-Pesa token missing in response')
  }

  logger.mpesa.success('OAuth token obtained', { file: 'src/lib/mpesa.ts' })
  return data.access_token
}

// =============================================
// Generate STK Push password (FIXED TIMEZONE)
// =============================================
function getPassword(): { password: string; timestamp: string } {
  // For Buy Goods APIs, the shortcode used for password generation is the Store Number
  const shortcode = process.env.MPESA_SHORTCODE! 
  const passkey = process.env.MPESA_PASSKEY!
  
  // Force East African Time (UTC+3) to prevent Safaricom silent drops
  const eatOffset = 3 * 60 * 60 * 1000; 
  const timestamp = new Date(Date.now() + eatOffset)
    .toISOString()
    .replace(/[^0-9]/g, '')
    .slice(0, 14)
    
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64')
  return { password, timestamp }
}

// =============================================
// STK Push — initiate payment (FIXED FOR TILL NUMBER)
// =============================================
export async function initiateStkPush({
  phone,
  amount,
  accountReference,
  description,
}: {
  phone: string
  amount: number
  accountReference: string
  description: string
}): Promise<{
  CheckoutRequestID: string
  MerchantRequestID: string
  ResponseCode: string
  ResponseDescription: string
  CustomerMessage: string
}> {
  const token = await getMpesaToken()
  const { password, timestamp } = getPassword()
  
  const storeNumber = process.env.MPESA_SHORTCODE!
  const tillNumber = process.env.MPESA_TILL_NUMBER! // Ensure this is in your .env
  const callbackUrl = process.env.MPESA_CALLBACK_URL!

  logger.mpesa.info(`Initiating STK Push for ${phone} — KES ${amount}`, {
    file: 'src/lib/mpesa.ts',
    function: 'initiateStkPush',
    input: { phone: phone.slice(0, 6) + '****', amount, accountReference },
  })

  const body = {
    BusinessShortCode: storeNumber,           // Must be the Store Number
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerBuyGoodsOnline', // Changed from CustomerPayBillOnline
    Amount: amount,
    PartyA: phone,
    PartyB: tillNumber,                       // Must be the actual Till Number
    PhoneNumber: phone,
    CallBackURL: callbackUrl,
    AccountReference: accountReference,       // Max 12 chars
    TransactionDesc: description,             // Max 13 chars
  }

  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()

  if (data.ResponseCode !== '0') {
    logger.mpesa.error(`STK Push failed: ${data.ResponseDescription}`, {
      file: 'src/lib/mpesa.ts',
      function: 'initiateStkPush',
      input: { phone: phone.slice(0, 6) + '****', amount },
    })
    throw new Error(data.ResponseDescription || 'STK Push failed')
  }

  logger.mpesa.success(`STK Push sent. CheckoutRequestID: ${data.CheckoutRequestID}`, {
    file: 'src/lib/mpesa.ts',
  })

  return data
}

// =============================================
// B2C Payment — payout to winner
// =============================================
export async function sendB2cPayment({
  phone,
  amount,
  remarks,
  occasion,
}: {
  phone: string
  amount: number
  remarks: string
  occasion: string
}): Promise<{
  ConversationID: string
  OriginatorConversationID: string
  ResponseCode: string
  ResponseDescription: string
}> {
  const token = await getMpesaToken()
  // B2C usually uses the Store Number or a dedicated B2C shortcode
  const shortcode = process.env.MPESA_SHORTCODE! 
  const initiator = process.env.MPESA_B2C_INITIATOR!
  const securityCredential = process.env.MPESA_B2C_SECURITY_CREDENTIAL!
  const resultUrl = process.env.MPESA_B2C_RESULT_URL!

  logger.mpesa.info(`Initiating B2C payment to ${phone} — KES ${amount}`, {
    file: 'src/lib/mpesa.ts',
    function: 'sendB2cPayment',
    input: { phone: phone.slice(0, 6) + '****', amount },
  })

  const body = {
    InitiatorName: initiator,
    SecurityCredential: securityCredential,
    CommandID: 'BusinessPayment',
    Amount: amount,
    PartyA: shortcode,
    PartyB: phone,
    Remarks: remarks,
    QueueTimeOutURL: resultUrl,
    ResultURL: resultUrl,
    Occasion: occasion,
  }

  const res = await fetch(`${BASE_URL}/mpesa/b2c/v1/paymentrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()

  if (data.ResponseCode !== '0') {
    logger.mpesa.error(`B2C payment failed: ${data.ResponseDescription}`, {
      file: 'src/lib/mpesa.ts',
      function: 'sendB2cPayment',
    })
    throw new Error(data.ResponseDescription || 'B2C payment failed')
  }

  logger.mpesa.success(`B2C payment initiated. ConversationID: ${data.ConversationID}`, {
    file: 'src/lib/mpesa.ts',
  })

  return data
}

// =============================================
// Phone number validation
// =============================================
export function validateMpesaPhone(phone: string): {
  valid: boolean
  formatted?: string
  error?: string
} {
  // Remove spaces, dashes, +
  const cleaned = phone.replace(/[\s\-+]/g, '')

  // Must start with 254 and be 12 digits
  if (/^254[0-9]{9}$/.test(cleaned)) {
    return { valid: true, formatted: cleaned }
  }

  // Accept 07XXXXXXXX or 01XXXXXXXX — convert to 254
  if (/^0[17][0-9]{8}$/.test(cleaned)) {
    const formatted = '254' + cleaned.slice(1)
    return { valid: true, formatted }
  }

  return {
    valid: false,
    error: 'Phone must be a valid Safaricom number (e.g. 0712345678 or 254712345678)',
  }
}