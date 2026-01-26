import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { loggerForRequest } from '@/lib/log'
import { queryProductByPidOrKeyword, mapCjItemToProductLike } from '@/lib/cj/v2'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

async function resyncOne(db: any, id: number) {
  // 1) Load product row (need cj_product_id, title as fallback)
  const { data: p } = await db.from('products')
    .select('id, slug, title, images, cj_product_id')
    .eq('id', id)
    .maybeSingle()
  if (!p) return { id, ok: false, error: 'product not found' }

  // 2) Determine CJ lookup input (pid preferred, else keyword)
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

  // 3) Update only media + title; keep existing slug/price
  const patch: any = {
    title: mapped.name,
    images: mapped.images || [],
    video_url: mapped.videoUrl || null,
    is_active: true,
  }
  // Only set cj_product_id if present and column exists
  try {
    const { error: err } = await db.from('products').update(patch).eq('id', id)
    if (err) return { id, ok: false, error: err.message }
  } catch (e: any) {
    return { id, ok: false, error: e?.message || 'update failed' }
  }
  return { id, ok: true, slug: p.slug }
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
    let ids: number[] = []
    if (idsParam) {
      ids = idsParam.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0)
    }

    // If no ids specified, pick up to 10 products missing images
    if (ids.length === 0) {
      const { data } = await db
        .from('products')
        .select('id, images')
        .order('id', { ascending: false })
        .limit(20)
      const candidates = (data || []) as any[]
      ids = candidates
        .filter((p) => !p.images || (Array.isArray(p.images) && p.images.length === 0) || (typeof p.images === 'string' && (!p.images.trim() || p.images.trim() === '[]')))
        .slice(0, 10)
        .map((p) => p.id)
    }

    const results: any[] = []
    for (const id of ids) {
      try { results.push(await resyncOne(db, id)) } catch (e: any) { results.push({ id, ok: false, error: e?.message || 'resync failed' }) }
    }

    const r = NextResponse.json({ ok: true, results })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'resync error' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
