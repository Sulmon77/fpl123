// src/lib/logger.ts
// Structured logging utility for FPL123
// Every log includes module, file context, and timestamp

type LogLevel = 'info' | 'success' | 'error' | 'warn' | 'debug'

interface LogContext {
  file?: string
  function?: string
  input?: Record<string, unknown>
  [key: string]: unknown
}

function formatLog(
  level: LogLevel,
  module: string,
  message: string,
  context?: LogContext
): void {
  const timestamp = new Date().toISOString()
  const prefix = `[${module}]`
  const icons: Record<LogLevel, string> = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warn: '⚠️',
    debug: '🔍',
  }

  const icon = icons[level]

  if (level === 'error') {
    console.error(`${prefix} ${icon} ${message}`, {
      timestamp,
      ...context,
    })
  } else if (level === 'warn') {
    console.warn(`${prefix} ${icon} ${message}`, {
      timestamp,
      ...context,
    })
  } else {
    console.log(`${prefix} ${icon} ${message}`, {
      timestamp,
      ...context,
    })
  }
}

export const logger = {
  // FPL API module
  fpl: {
    info: (msg: string, ctx?: LogContext) => formatLog('info', 'FPL API', msg, ctx),
    success: (msg: string, ctx?: LogContext) => formatLog('success', 'FPL API', msg, ctx),
    error: (msg: string, ctx?: LogContext) => formatLog('error', 'FPL API', msg, ctx),
    warn: (msg: string, ctx?: LogContext) => formatLog('warn', 'FPL API', msg, ctx),
  },

  // M-Pesa module
  mpesa: {
    info: (msg: string, ctx?: LogContext) => formatLog('info', 'MPESA', msg, ctx),
    success: (msg: string, ctx?: LogContext) => formatLog('success', 'MPESA', msg, ctx),
    error: (msg: string, ctx?: LogContext) => formatLog('error', 'MPESA', msg, ctx),
    warn: (msg: string, ctx?: LogContext) => formatLog('warn', 'MPESA', msg, ctx),
  },

  // PayPal module
  paypal: {
    info: (msg: string, ctx?: LogContext) => formatLog('info', 'PAYPAL', msg, ctx),
    success: (msg: string, ctx?: LogContext) => formatLog('success', 'PAYPAL', msg, ctx),
    error: (msg: string, ctx?: LogContext) => formatLog('error', 'PAYPAL', msg, ctx),
    warn: (msg: string, ctx?: LogContext) => formatLog('warn', 'PAYPAL', msg, ctx),
  },

  // Database module
  db: {
    info: (msg: string, ctx?: LogContext) => formatLog('info', 'DB', msg, ctx),
    success: (msg: string, ctx?: LogContext) => formatLog('success', 'DB', msg, ctx),
    error: (msg: string, ctx?: LogContext) => formatLog('error', 'DB', msg, ctx),
    warn: (msg: string, ctx?: LogContext) => formatLog('warn', 'DB', msg, ctx),
  },

  // Cron jobs module
  cron: {
    info: (msg: string, ctx?: LogContext) => formatLog('info', 'CRON', msg, ctx),
    success: (msg: string, ctx?: LogContext) => formatLog('success', 'CRON', msg, ctx),
    error: (msg: string, ctx?: LogContext) => formatLog('error', 'CRON', msg, ctx),
    warn: (msg: string, ctx?: LogContext) => formatLog('warn', 'CRON', msg, ctx),
  },

  // Auth module
  auth: {
    info: (msg: string, ctx?: LogContext) => formatLog('info', 'AUTH', msg, ctx),
    success: (msg: string, ctx?: LogContext) => formatLog('success', 'AUTH', msg, ctx),
    error: (msg: string, ctx?: LogContext) => formatLog('error', 'AUTH', msg, ctx),
    warn: (msg: string, ctx?: LogContext) => formatLog('warn', 'AUTH', msg, ctx),
  },

  // Groups module
  groups: {
    info: (msg: string, ctx?: LogContext) => formatLog('info', 'GROUPS', msg, ctx),
    success: (msg: string, ctx?: LogContext) => formatLog('success', 'GROUPS', msg, ctx),
    error: (msg: string, ctx?: LogContext) => formatLog('error', 'GROUPS', msg, ctx),
    warn: (msg: string, ctx?: LogContext) => formatLog('warn', 'GROUPS', msg, ctx),
  },

  // Standings module
  standings: {
    info: (msg: string, ctx?: LogContext) => formatLog('info', 'STANDINGS', msg, ctx),
    success: (msg: string, ctx?: LogContext) => formatLog('success', 'STANDINGS', msg, ctx),
    error: (msg: string, ctx?: LogContext) => formatLog('error', 'STANDINGS', msg, ctx),
    warn: (msg: string, ctx?: LogContext) => formatLog('warn', 'STANDINGS', msg, ctx),
  },

  // Payouts module
  payouts: {
    info: (msg: string, ctx?: LogContext) => formatLog('info', 'PAYOUTS', msg, ctx),
    success: (msg: string, ctx?: LogContext) => formatLog('success', 'PAYOUTS', msg, ctx),
    error: (msg: string, ctx?: LogContext) => formatLog('error', 'PAYOUTS', msg, ctx),
    warn: (msg: string, ctx?: LogContext) => formatLog('warn', 'PAYOUTS', msg, ctx),
  },

  // Generic
  info: (module: string, msg: string, ctx?: LogContext) => formatLog('info', module, msg, ctx),
  success: (module: string, msg: string, ctx?: LogContext) => formatLog('success', module, msg, ctx),
  error: (module: string, msg: string, ctx?: LogContext) => formatLog('error', module, msg, ctx),
  warn: (module: string, msg: string, ctx?: LogContext) => formatLog('warn', module, msg, ctx),
}
