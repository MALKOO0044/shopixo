import { NextResponse } from 'next/server'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { loggerForRequest } from '@/lib/log'
import { mapCjItemToProductLike, queryProductByPidOrKeyword } from '@/lib/cj/v2'

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

    const r = NextResponse.json({ ok: true, mapped, raw: itemRaw })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'inspect failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
