// src/lib/admin-auth.ts
// Helper to check admin auth in API routes

import { NextRequest, NextResponse } from 'next/server'

export function requireAdminAuth(request: NextRequest): { authorized: boolean; response?: NextResponse } {
  const adminPassword = process.env.ADMIN_PASSWORD
  const sessionCookie = request.cookies.get('admin_session')?.value

  if (!adminPassword || sessionCookie !== adminPassword) {
    return {
      authorized: false,
      response: NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 }),
    }
  }

  return { authorized: true }
}
