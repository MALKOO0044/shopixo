import { NextResponse } from 'next/server'
import { loggerForRequest } from '@/lib/log'
import { getAccessToken, probeCjEndpoint } from '@/lib/cj/v2'
import {
  diffCounterSnapshots,
  getRequestCountersSnapshot,
  withRequestCounters,
} from '@/lib/telemetry/request-counters'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  return withRequestCounters(async () => {
    const log = loggerForRequest(req)
    const requestCounterBefore = getRequestCountersSnapshot()
    const withCallbackTelemetry = <T extends Record<string, any>>(payload: T) => ({
      ...payload,
      cjApiCallbacks: diffCounterSnapshots(requestCounterBefore, getRequestCountersSnapshot()),
    })

    try {
      const { searchParams } = new URL(req.url)
      const kw = searchParams.get('kw') || 'dress'

      const out: any = { ok: false, kw }

      // Step 1: obtain token (do not expose token)
      try {
        const token = await getAccessToken()
        out.tokenObtained = !!token
        out.tokenPreview = token ? token.slice(0, 4) + '...' + token.slice(-4) : null
      } catch (e: any) {
        out.tokenObtained = false
        out.tokenError = e?.message || String(e)
      }

      // If token not obtained, return early
      if (!out.tokenObtained) {
        const r = NextResponse.json(withCallbackTelemetry({ ok: false, step: 'token', ...out }), { status: 500 })
        r.headers.set('x-request-id', log.requestId)
        return r
      }

      // Step 2: probe endpoints through CJ v2 helper
      const probes = [
        `/product/list?keyWords=${encodeURIComponent(kw)}&pageSize=1&pageNum=1`,
        `/product/query?keyword=${encodeURIComponent(kw)}&pageSize=1&pageNumber=1`,
        `/product/myProduct/query?keyword=${encodeURIComponent(kw)}&pageSize=1&pageNumber=1`,
      ]

      out.tests = []
      for (const p of probes) {
        try {
          const r = await probeCjEndpoint<any>(p, {
            method: 'GET',
            timeoutMs: 12000,
            retries: 1,
          })
          out.tests.push({
            path: p,
            status: r.status,
            ok: r.ok,
            sample: r.body?.data ? Object.keys(r.body.data).slice(0, 3) : undefined,
          })
        } catch (e: any) {
          out.tests.push({ path: p, error: e?.message || String(e) })
        }
      }

      out.ok = true
      const r = NextResponse.json(withCallbackTelemetry(out))
      r.headers.set('x-request-id', log.requestId)
      return r
    } catch (e: any) {
      const r = NextResponse.json(withCallbackTelemetry({ ok: false, error: e?.message || String(e) }), { status: 500 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }
  })
}
