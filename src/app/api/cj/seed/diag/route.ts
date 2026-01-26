import { NextResponse } from 'next/server'
import { loggerForRequest } from '@/lib/log'
import { getAccessToken } from '@/lib/cj/v2'
import { fetchWithMeta } from '@/lib/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function getBase(): string {
  const b = process.env.CJ_API_BASE || 'https://developers.cjdropshipping.com/api2.0/v1'
  return b.replace(/\/$/, '')
}

export async function GET(req: Request) {
  const log = loggerForRequest(req)
  try {
    const { searchParams } = new URL(req.url)
    const kw = searchParams.get('kw') || 'dress'

    const out: any = { ok: false, kw }

    // Step 1: obtain token (do not expose token)
    try {
      const token = await getAccessToken()
      out.tokenObtained = !!token
      out.tokenPreview = token ? token.slice(0, 4) + '…' + token.slice(-4) : null
    } catch (e: any) {
      out.tokenObtained = false
      out.tokenError = e?.message || String(e)
    }

    // If token not obtained, return early
    if (!out.tokenObtained) {
      const r = NextResponse.json({ ok: false, step: 'token', ...out }, { status: 500 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    // Step 2: probe endpoints with sanitized output
    const tokenHeader = { 'CJ-Access-Token': 'hidden' }
    const base = getBase()
    const probes = [
      `/product/list?keyWords=${encodeURIComponent(kw)}&pageSize=1&pageNum=1`,
      `/product/query?keyword=${encodeURIComponent(kw)}&pageSize=1&pageNumber=1`,
      `/product/myProduct/query?keyword=${encodeURIComponent(kw)}&pageSize=1&pageNumber=1`,
    ]

    out.tests = []
    for (const p of probes) {
      const url = `${base}${p}`
      try {
        const r = await fetchWithMeta<any>(url, {
          method: 'GET',
          headers: { 'CJ-Access-Token': (await getAccessToken()) },
          cache: 'no-store',
          timeoutMs: 12000,
          retries: 1,
        })
        out.tests.push({ path: p, status: r.status, ok: r.ok, sample: r.body?.data ? Object.keys(r.body.data).slice(0, 3) : undefined })
      } catch (e: any) {
        out.tests.push({ path: p, error: e?.message || String(e) })
      }
    }

    out.ok = true
    const r = NextResponse.json(out)
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
