import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { loggerForRequest } from '@/lib/log'
import { mapCjItemToProductLike, queryProductByPidOrKeyword } from '@/lib/cj/v2'
import { persistRawCj, upsertProductFromCj } from '@/lib/ops/cj-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function tokenOk(req: Request): boolean {
  try {
    const url = new URL(req.url)
    const qp = url.searchParams.get('token') || ''
    const hdr = req.headers.get('x-seed-token') || ''
    const auth = req.headers.get('authorization') || ''
    const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : ''
    const provided = qp || hdr || bearer
    const expected = process.env.SEED_IMPORT_TOKEN || ''
    if (!expected) return false
    return !!provided && provided === expected
  } catch { return false }
}

async function allow(req: Request) {
  const admin = await ensureAdmin()
  if (admin.ok) return true
  if (tokenOk(req)) return true
  return false
}

async function handleImport(codes: string[]) {
  const results: any[] = []
  for (const rawCode of codes) {
    const code = String(rawCode || '').trim()
    if (!code) { results.push({ code, ok: false, error: 'empty code' }); continue }
    try {
      const raw = await queryProductByPidOrKeyword({ pid: code })
      const itemRaw = Array.isArray((raw as any)?.data?.list)
        ? (raw as any).data.list[0]
        : Array.isArray((raw as any)?.data?.content)
          ? (raw as any).data.content[0]
          : Array.isArray((raw as any)?.content)
            ? (raw as any).content[0]
            : Array.isArray((raw as any)?.data)
              ? (raw as any).data[0]
              : ((raw as any)?.data || raw)

      const mapped = mapCjItemToProductLike(itemRaw)
      if (!mapped) { results.push({ code, ok: false, error: 'CJ item mapping failed' }); continue }

      const up = await upsertProductFromCj(mapped, { updateImages: true, updateVideo: true, updatePrice: true })
      if (up.ok) {
        try { await persistRawCj(up.productId, itemRaw) } catch {}
        const variantCount = Array.isArray(mapped.variants) ? mapped.variants.length : 0
        const totalStock = (Array.isArray(mapped.variants) ? mapped.variants : []).reduce((a, v: any) => a + (typeof v.stock === 'number' ? v.stock : 0), 0)
        results.push({ code, ok: true, productId: up.productId, updated: up.updated, variantCount, totalStock })
      } else {
        results.push({ code, ok: false, error: up.error || 'upsert failed' })
      }
    } catch (e: any) {
      results.push({ code, ok: false, error: e?.message || 'import failed' })
    }
  }
  return results
}

export async function GET(req: Request) {
  const log = loggerForRequest(req)
  try {
    if (!(await allow(req))) {
      const r = NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }
    const url = new URL(req.url)
    const codesParam = url.searchParams.get('codes') || ''
    const codes = codesParam.split(',').map(s => s.trim()).filter(Boolean)
    if (codes.length === 0) {
      const r = NextResponse.json({ ok: false, error: 'Missing codes' }, { status: 400 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }
    const results = await handleImport(codes)
    const r = NextResponse.json({ ok: true, count: results.length, results })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'import failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}

export async function POST(req: Request) {
  const log = loggerForRequest(req)
  try {
    if (!(await allow(req))) {
      const r = NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }
    const body = await req.json().catch(() => ({}))
    const Schema = z.object({ codes: z.array(z.string()).min(1) })
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      const r = NextResponse.json({ ok: false, error: 'Invalid body; expected { codes: string[] }' }, { status: 400 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }
    const results = await handleImport(parsed.data.codes)
    const r = NextResponse.json({ ok: true, count: results.length, results })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'import failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
