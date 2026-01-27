import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { loggerForRequest } from '@/lib/log'
import { mapCjItemToProductLike, queryProductByPidOrKeyword } from '@/lib/cj/v2'
import { persistRawCj, upsertProductFromCj } from '@/lib/ops/cj-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request, ctx: { params: { pid: string } }) {
  const log = loggerForRequest(req)
  try {
    const guard = await ensureAdmin()
    if (!guard.ok) {
      const r = NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const pid = decodeURIComponent(ctx.params.pid)
    if (!pid) {
      const r = NextResponse.json({ ok: false, error: 'Missing pid' }, { status: 400 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const { searchParams } = new URL(req.url)
    const Q = z.object({
      updateImages: z.string().optional(),
      updateVideo: z.string().optional(),
      updatePrice: z.string().optional(),
    })
    const q = Q.parse({
      updateImages: searchParams.get('updateImages') || undefined,
      updateVideo: searchParams.get('updateVideo') || undefined,
      updatePrice: searchParams.get('updatePrice') || undefined,
    })
    const toBool = (v: string | undefined, def: boolean) => v ? v.toLowerCase() === 'true' : def
    const updateImages = toBool(q.updateImages, true)
    const updateVideo = toBool(q.updateVideo, true)
    const updatePrice = toBool(q.updatePrice, true)

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
    if (!mapped) {
      const r = NextResponse.json({ ok: false, error: 'CJ item mapping failed' }, { status: 502 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const up = await upsertProductFromCj(mapped, { updateImages, updateVideo, updatePrice })
    if (up.ok) {
      try { await persistRawCj(up.productId, itemRaw) } catch {}
      const r = NextResponse.json({ ok: true, productId: up.productId, updated: up.updated })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const r = NextResponse.json({ ok: false, error: up.error }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'sync failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
