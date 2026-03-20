// src/app/api/admin/rules/route.ts
// Admin CRUD for rules

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, data: data ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = requireAdminAuth(request)
  if (!auth.authorized) return auth.response!

  const supabase = createServerSupabaseClient()
  const body = await request.json()
  const { action, id, title, body: ruleBody, sort_order, rules } = body

  // Bulk save (full replace)
  if (action === 'replace_all' && Array.isArray(rules)) {
    // Delete all existing rules then insert fresh
    await supabase.from('rules').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    if (rules.length === 0) {
      return NextResponse.json({ success: true, data: { saved: 0 } })
    }

    const inserts = rules.map((r: { title: string; body: string }, i: number) => ({
      title: r.title,
      body: r.body,
      sort_order: i,
    }))

    const { error } = await supabase.from('rules').insert(inserts)
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, data: { saved: inserts.length } })
  }

  // Create
  if (action === 'create') {
    const { data, error } = await supabase
      .from('rules')
      .insert({ title, body: ruleBody, sort_order: sort_order ?? 0 })
      .select()
      .single()
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data })
  }

  // Update
  if (action === 'update' && id) {
    const update: Record<string, unknown> = {}
    if (title !== undefined) update.title = title
    if (ruleBody !== undefined) update.body = ruleBody
    if (sort_order !== undefined) update.sort_order = sort_order

    const { error } = await supabase.from('rules').update(update).eq('id', id)
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // Delete
  if (action === 'delete' && id) {
    const { error } = await supabase.from('rules').delete().eq('id', id)
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400 })
}