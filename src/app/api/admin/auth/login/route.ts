// src/app/api/admin/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminPassword) {
      logger.auth.error('ADMIN_PASSWORD not configured', {
        file: 'src/app/api/admin/auth/login/route.ts',
      })
      return NextResponse.json({ success: false, error: 'Admin not configured.' }, { status: 500 })
    }

    if (password !== adminPassword) {
      logger.auth.warn('Failed admin login attempt', {
        file: 'src/app/api/admin/auth/login/route.ts',
      })
      return NextResponse.json({ success: false, error: 'Incorrect password.' }, { status: 401 })
    }

    logger.auth.success('Admin logged in', {
      file: 'src/app/api/admin/auth/login/route.ts',
    })

    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_session', adminPassword, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    })

    return response
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Login failed.' }, { status: 500 })
  }
}
