import { NextResponse } from 'next/server'
import { loggerForRequest } from '@/lib/log'
import { createClient } from '@supabase/supabase-js'
import { queryProductByPidOrKeyword, mapCjItemToProductLike } from '@/lib/cj/v2'
import { upsertProductFromCj } from '@/lib/ops/cj-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

async function resyncFullOne(db: any, id: number) {
  const { data: p } = await db.from('products')
    .select('id, slug, title, cj_product_id')
    .eq('id', id)
    .maybeSingle()
  if (!p) return { id, ok: false, error: 'product not found' }

  const pid: string | undefined = (p as any).cj_product_id || undefined
  const keyword: string | undefined = pid ? undefined : String((p as any).title || '').split(' ').slice(0, 6).join(' ') || undefined

  const raw = await queryProductByPidOrKeyword({ pid, keyword })
  const list: any[] = Array.isArray(raw?.data?.content)
    ? raw.data.content
    : Array.isArray(raw?.data?.list)
      ? raw.data.list
      : Array.isArray(raw?.content)
        ? raw.content
        : Array.isArray(raw?.data)
          ? raw.data
          : []
  if (!list || list.length === 0) return { id, ok: false, error: 'cj not found' }

  const mapped = mapCjItemToProductLike(list[0])
  if (!mapped) return { id, ok: false, error: 'map failed' }

  const up = await upsertProductFromCj(mapped, { updateImages: true, updateVideo: true, updatePrice: true })
  if (!('ok' in up) || !up.ok) return { id, ok: false, error: (up as any).error || 'upsert failed' }
  return { id, ok: true, productId: up.productId, slug: p.slug }
}

export async function GET(req: Request) {
  const log = loggerForRequest(req)
  try {
    const db = getAdmin()
    if (!db) {
      const r = NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 500 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const { searchParams } = new URL(req.url)
    const idsParam = searchParams.get('ids') || ''
    const allFlag = (searchParams.get('all') || '').trim() === '1'
    const limit = Math.max(1, Math.min(200, Number(searchParams.get('limit') || '30')))
    let ids: number[] = []
    if (idsParam) ids = idsParam.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0)

    // If no ids specified, pick products missing media or with price 0
    if (ids.length === 0) {
      const { data } = await db
        .from('products')
        .select('id, images, price')
        .order('id', { ascending: false })
        .limit(limit)
      const candidates = (data || []) as any[]
      ids = candidates
        .filter((p) => p.price === 0 || !p.images || (Array.isArray(p.images) && p.images.length === 0) || (typeof p.images === 'string' && (!p.images.trim() || p.images.trim() === '[]')))
        .slice(0, allFlag ? limit : Math.min(limit, 10))
        .map((p) => p.id)
    }

    const results: any[] = []
    for (const id of ids) {
      try { results.push(await resyncFullOne(db, id)) } catch (e: any) { results.push({ id, ok: false, error: e?.message || 'resync failed' }) }
    }

    const r = NextResponse.json({ ok: true, results })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'resync full error' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
