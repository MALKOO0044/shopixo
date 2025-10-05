import { NextResponse } from 'next/server'
import { z } from 'zod'
import { loggerForRequest } from '@/lib/log'
import { createClient } from '@supabase/supabase-js'
import { queryProductByPidOrKeyword, mapCjItemToProductLike, type CjProductLike } from '@/lib/cj/v2'
import { upsertProductFromCj, persistRawCj } from '@/lib/ops/cj-sync'

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
    const Q = z.object({
      keywords: z.string().min(1), // comma-separated list
      limit: z.coerce.number().min(1).max(20).default(6),
      token: z.string().optional(),
    })
    const { searchParams } = new URL(req.url)
    const q = Q.parse({
      keywords: searchParams.get('keywords') || '',
      limit: searchParams.get('limit') || '6',
      token: searchParams.get('token') || undefined,
    })

    const db = getAdmin()
    if (!db) {
      const r = NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 500 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    // Access policy similar to seed/one: allow if products=0 else require token match
    const { count: productsCountRaw } = await db.from('products').select('id', { count: 'exact', head: true })
    const productsCount = typeof productsCountRaw === 'number' ? productsCountRaw : 0
    const tokenEnv = String(process.env.SEED_IMPORT_TOKEN || '')
    const disabled = String(process.env.SEED_IMPORT_DISABLED || '').toLowerCase() === 'true'
    const allowWithoutToken = productsCount === 0
    const tokenOk = !!tokenEnv && q.token === tokenEnv
    if (disabled || (!allowWithoutToken && !tokenOk)) {
      const r = NextResponse.json({ ok: false, error: 'Seed not allowed' }, { status: 403 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const keywords = q.keywords
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10)

    if (keywords.length === 0) {
      const r = NextResponse.json({ ok: false, error: 'Provide ?keywords=women%20dress,women%20blouse&limit=6' }, { status: 400 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    // 1) Query CJ for each keyword and map
    const pool: CjProductLike[] = []
    for (const kw of keywords) {
      try {
        const raw = await queryProductByPidOrKeyword({ keyword: kw })
        const itemsRaw = Array.isArray(raw?.data?.list)
          ? raw.data.list
          : Array.isArray(raw?.data?.content)
            ? raw.data.content
            : Array.isArray(raw?.content)
              ? raw.content
              : Array.isArray(raw?.data)
                ? raw.data
                : []
        for (const it of itemsRaw) {
          const mapped = mapCjItemToProductLike(it)
          if (mapped) pool.push(mapped)
        }
      } catch {}
    }

    // 2) Deduplicate by productId and select first N
    const seen = new Set<string>()
    const selected: CjProductLike[] = []
    for (const it of pool) {
      if (!it.productId) continue
      if (seen.has(it.productId)) continue
      seen.add(it.productId)
      selected.push(it)
      if (selected.length >= q.limit) break
    }

    if (selected.length === 0) {
      const r = NextResponse.json({ ok: false, error: 'No CJ products found from given keywords' }, { status: 404 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    // 3) Import each
    const results: any[] = []
    for (const cj of selected) {
      try {
        // Enrich via detail fetch by PID for better media/variants
        let enriched = cj
        try {
          const d = await queryProductByPidOrKeyword({ pid: cj.productId })
          const dlist: any[] = Array.isArray(d?.data?.content)
            ? d.data.content
            : Array.isArray(d?.data?.list)
              ? d.data.list
              : Array.isArray(d?.content)
                ? d.content
                : Array.isArray(d?.data)
                  ? d.data
                  : []
          if (dlist && dlist[0]) {
            const remap = mapCjItemToProductLike(dlist[0])
            if (remap) enriched = remap
          }
        } catch {}

        const up = await upsertProductFromCj(enriched, { updateImages: true, updateVideo: true, updatePrice: true })
        if (!('ok' in up) || !up.ok) {
          results.push({ ok: false, error: (up as any).error || 'Upsert failed', productId: null })
          continue
        }
        try { await persistRawCj(up.productId, cj as any) } catch {}

        // fetch slug for convenience
        let slug: string | undefined
        try {
          const { data } = await db.from('products').select('slug').eq('id', up.productId).maybeSingle()
          slug = data?.slug || undefined
        } catch {}

        results.push({ ok: true, productId: up.productId, slug })
      } catch (e: any) {
        results.push({ ok: false, error: e?.message || String(e), productId: null })
      }
    }

    const r = NextResponse.json({ ok: true, imported: results })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'batch seed failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
