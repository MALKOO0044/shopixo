import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { loggerForRequest } from '@/lib/log'
import { listCjProductsPage, mapCjItemToProductLike, queryProductByPidOrKeyword } from '@/lib/cj/v2'
import { persistRawCj, upsertProductFromCj } from '@/lib/ops/cj-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const log = loggerForRequest(req)
  try {
    const guard = await ensureAdmin()
    if (!guard.ok) {
      const r = NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const { searchParams } = new URL(req.url)
    const Q = z.object({
      pageNum: z.string().optional(),
      pageSize: z.string().optional(),
      keyword: z.string().optional(),
      updateImages: z.string().optional(),
      updateVideo: z.string().optional(),
      updatePrice: z.string().optional(),
    })
    const q = Q.parse({
      pageNum: searchParams.get('pageNum') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
      keyword: searchParams.get('keyword') || undefined,
      updateImages: searchParams.get('updateImages') || undefined,
      updateVideo: searchParams.get('updateVideo') || undefined,
      updatePrice: searchParams.get('updatePrice') || undefined,
    })
    const pageNum = Math.max(1, Number(q.pageNum || '1'))
    const pageSize = Math.min(50, Math.max(1, Number(q.pageSize || '20')))
    const keyword = q.keyword || ''
    const toBool = (v: string | undefined, d: boolean) => v ? v.toLowerCase() === 'true' : d
    const updateImages = toBool(q.updateImages, true)
    const updateVideo = toBool(q.updateVideo, true)
    const updatePrice = toBool(q.updatePrice, true)

    // 1) List a catalog page
    const list = await listCjProductsPage({ pageNum, pageSize, keyword: keyword || undefined })
    const arr: any[] = Array.isArray(list?.data?.list)
      ? list.data.list
      : Array.isArray(list?.data?.content)
        ? list.data.content
        : Array.isArray(list?.list)
          ? list.list
          : Array.isArray(list?.data)
            ? list.data
            : Array.isArray(list)
              ? list
              : []

    if (arr.length === 0) {
      const r = NextResponse.json({ ok: true, pageNum, pageSize, count: 0, results: [] })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    // 2) For each item, resolve full details then map + upsert
    const results: any[] = []
    for (const it of arr) {
      try {
        const pid = String(it.pid || it.productId || it.id || '')
        if (!pid) { results.push({ ok: false, reason: 'no pid' }); continue }
        const raw = await queryProductByPidOrKeyword({ pid })
        const itemRaw = Array.isArray(raw?.data?.list)
          ? raw.data.list[0]
          : Array.isArray(raw?.data?.content)
            ? raw.data.content[0]
            : Array.isArray(raw?.content)
              ? raw.content[0]
              : Array.isArray(raw?.data)
                ? raw.data[0]
                : (raw?.data || raw)
        const mapped = mapCjItemToProductLike(itemRaw)
        if (!mapped) { results.push({ ok: false, pid, reason: 'map failed' }); continue }
        const up = await upsertProductFromCj(mapped, { updateImages, updateVideo, updatePrice })
        if (up.ok) {
          try { await persistRawCj(up.productId, itemRaw) } catch {}
          results.push({ ok: true, pid, productId: up.productId, updated: up.updated })
        } else {
          results.push({ ok: false, pid, error: up.error })
        }
      } catch (e: any) {
        results.push({ ok: false, error: e?.message || String(e) })
      }
    }

    const r = NextResponse.json({ ok: true, pageNum, pageSize, count: results.filter(r => r.ok).length, results })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'catalog sync failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
