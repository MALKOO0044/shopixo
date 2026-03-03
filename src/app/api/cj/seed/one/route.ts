import { NextResponse } from 'next/server'
import { z } from 'zod'
import { loggerForRequest } from '@/lib/log'
import { queryProductByPidOrKeyword, mapCjItemToProductLike } from '@/lib/cj/v2'
import { upsertProductFromCj, persistRawCj } from '@/lib/ops/cj-sync'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const log = loggerForRequest(req)
  try {
    const { searchParams } = new URL(req.url)
    const Q = z.object({
      token: z.string().optional(),
      pid: z.string().optional(),
      keyword: z.string().optional(),
    })

    const q = Q.parse({
      token: searchParams.get('token') || undefined,
      pid: searchParams.get('pid') || undefined,
      keyword: searchParams.get('keyword') || undefined,
    })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      const r = NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 500 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }
    const db = createClient(url, key)

    // Bootstrap policy: if there are zero products, allow without token once.
    // Otherwise require token === SEED_IMPORT_TOKEN.
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

    const keyword = q.keyword || (q.pid ? undefined : 'women dress')
    const raw = await queryProductByPidOrKeyword({ pid: q.pid || undefined, keyword })

    const list: any[] = Array.isArray(raw?.data?.content)
      ? raw.data.content
      : Array.isArray(raw?.data?.list)
        ? raw.data.list
        : Array.isArray(raw?.content)
          ? raw.content
          : Array.isArray(raw?.data)
            ? raw.data
            : []

    if (!list || list.length === 0) {
      const r = NextResponse.json({ ok: false, error: 'No CJ items found' }, { status: 404 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const itemRaw = list[0]
    // Enrich: if keyword search returned a shallow item, fetch product detail by PID before mapping
    let mapped = mapCjItemToProductLike(itemRaw)
    try {
      const pid = (mapped?.productId || String((itemRaw as any)?.pid || (itemRaw as any)?.productId || '')) as string
      if (pid) {
        const detail = await queryProductByPidOrKeyword({ pid })
        const dlist: any[] = Array.isArray(detail?.data?.content)
          ? detail.data.content
          : Array.isArray(detail?.data?.list)
            ? detail.data.list
            : Array.isArray(detail?.content)
              ? detail.content
              : Array.isArray(detail?.data)
                ? detail.data
                : []
        if (dlist && dlist[0]) {
          const remapped = mapCjItemToProductLike(dlist[0])
          if (remapped) mapped = remapped
        }
      }
    } catch {}
    if (!mapped) {
      const r = NextResponse.json({ ok: false, error: 'Mapping failed' }, { status: 422 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const up = await upsertProductFromCj(mapped, { updateImages: true, updateVideo: true, updatePrice: true })
    if (!('ok' in up) || !up.ok) {
      const r = NextResponse.json({ ok: false, error: (up as any).error || 'Upsert failed' }, { status: 500 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    try { await persistRawCj(up.productId, itemRaw) } catch {}

    let slug: string | undefined
    try {
      const { data } = await db.from('products').select('slug').eq('id', up.productId).maybeSingle()
      slug = data?.slug || undefined
    } catch {}

    const r = NextResponse.json({ ok: true, productId: up.productId, slug, updated: up.updated })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'seed failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
