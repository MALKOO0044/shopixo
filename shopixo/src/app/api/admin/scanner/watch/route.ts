import { NextResponse } from 'next/server'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { loggerForRequest } from '@/lib/log'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function GET(req: Request) {
  const log = loggerForRequest(req)
  try {
    const guard = await ensureAdmin()
    if (!guard.ok) {
      const r = NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }
    const db = getAdmin()
    if (!db) return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 })
    const { data, error } = await db.from('cj_inventory_watch').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, watch: data || [] })
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'watch list failed' }, { status: 500 })
    r.headers.set('x-request-id', loggerForRequest(req).requestId)
    return r
  }
}

export async function POST(req: Request) {
  const log = loggerForRequest(req)
  try {
    const guard = await ensureAdmin()
    if (!guard.ok) {
      const r = NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }
    const db = getAdmin()
    if (!db) return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 })
    let body: any = {}
    try { body = await req.json() } catch {}
    const row = {
      cj_product_id: String(body.cj_product_id || '').trim(),
      cj_sku: (body.cj_sku ? String(body.cj_sku).trim() : null) as string | null,
      threshold_low: typeof body.threshold_low === 'number' ? Math.max(0, Math.floor(body.threshold_low)) : 0,
      price_change_threshold: typeof body.price_change_threshold === 'number' ? Math.max(0, Math.floor(body.price_change_threshold)) : 5,
      watch_price: body.watch_price !== false,
      watch_stock: body.watch_stock !== false,
    }
    if (!row.cj_product_id) return NextResponse.json({ ok: false, error: 'cj_product_id required' }, { status: 400 })
    const { error } = await db.from('cj_inventory_watch').upsert(row, { onConflict: 'cj_product_id, cj_sku' })
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'watch upsert failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}

export async function DELETE(req: Request) {
  const log = loggerForRequest(req)
  try {
    const guard = await ensureAdmin()
    if (!guard.ok) {
      const r = NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }
    const db = getAdmin()
    if (!db) return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 })
    const { searchParams } = new URL(req.url)
    const pid = searchParams.get('cj_product_id') || ''
    const sku = searchParams.get('cj_sku') || ''
    if (!pid) return NextResponse.json({ ok: false, error: 'cj_product_id required' }, { status: 400 })
    const q = db.from('cj_inventory_watch').delete().eq('cj_product_id', pid)
    const exec = sku ? q.eq('cj_sku', sku) : q.is('cj_sku', null)
    const { error } = await exec
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'watch delete failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
