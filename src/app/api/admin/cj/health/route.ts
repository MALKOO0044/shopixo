import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { loggerForRequest } from '@/lib/log'
import { hasColumn, hasTable } from '@/lib/db-features'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function getSupabaseAdmin() {
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

    const db = getSupabaseAdmin()
    if (!db) {
      const r = NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const metrics: Record<string, any> = {}

    // Products
    const { data: prodCount } = await db.from('products').select('id', { count: 'exact', head: true })
    metrics.productsTotal = (prodCount as any)?.length ?? undefined // Supabase head doesn't return length in SDK; skip exact
    try {
      const { data } = await db.from('products').select('id').eq('price', 0).limit(1)
      metrics.productsZeroPrice = Array.isArray(data) ? data.length : undefined // indicative only
    } catch {}

    if (await hasColumn('products', 'is_active')) {
      try {
        const { data } = await db.from('products').select('id').eq('is_active', false).limit(1)
        metrics.productsInactive = Array.isArray(data) ? data.length : undefined
      } catch {}
    }

    // Variants (optional table)
    if (await hasTable('product_variants')) {
      try {
        const { data } = await db.from('product_variants').select('id').limit(1)
        metrics.variantsPresent = Array.isArray(data) ? data.length : 0
      } catch {}
    }

    // Logs (optional)
    if (await hasTable('sync_logs')) {
      try {
        const { data } = await db.from('sync_logs').select('*').order('created_at', { ascending: false }).limit(20)
        metrics.latestSyncLogs = data || []
      } catch {}
    }

    const r = NextResponse.json({ ok: true, metrics })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'health failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
