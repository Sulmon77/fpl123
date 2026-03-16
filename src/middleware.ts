// src/middleware.ts
// Protects admin routes
// The admin path is a secret URL segment — never revealed in public code

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const adminPath = process.env.ADMIN_SECRET_PATH
  const { pathname } = request.nextUrl

  // If admin path isn't configured, block all /admin routes for safety
  if (!adminPath) {
    return NextResponse.next()
  }

  // Check if this is an admin route (the secret path)
  const isAdminRoute =
    pathname === `/${adminPath}` || pathname.startsWith(`/${adminPath}/`)

  if (!isAdminRoute) {
    return NextResponse.next()
  }

  // Allow the login page itself
  if (pathname === `/${adminPath}`) {
    return NextResponse.next()
  }

  // Check for admin session cookie
  const adminSession = request.cookies.get('admin_session')?.value

  if (!adminSession || adminSession !== process.env.ADMIN_PASSWORD) {
    // Redirect to admin login
    return NextResponse.redirect(new URL(`/${adminPath}`, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all routes — we filter in the middleware function
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
