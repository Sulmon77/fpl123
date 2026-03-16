// src/lib/supabase.ts
// Supabase client configuration for server and client components

import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// =============================================
// CLIENT-SIDE Supabase (for use in client components)
// Uses anon key — respects RLS
// =============================================
export function createBrowserClient() {
  return createClient(supabaseUrl, supabaseAnonKey)
}

// =============================================
// SERVER-SIDE Supabase (for use in Server Components and Route Handlers)
// Uses service role key — bypasses RLS
// ONLY use in API routes and server actions
// =============================================
export function createServerSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// =============================================
// SERVER COMPONENT Supabase (with cookie support)
// Uses anon key — for server components that need auth context
// =============================================
export function createServerComponentClient() {
  const cookieStore = cookies()
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })
}

// =============================================
// ADMIN Supabase — alias for server client
// Named explicitly for clarity in admin routes
// =============================================
export const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Type helper — get the Supabase client type
export type SupabaseClient = ReturnType<typeof createServerSupabaseClient>
