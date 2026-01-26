import { NextResponse } from 'next/server'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { loggerForRequest } from '@/lib/log'
import { getSetting, setSetting } from '@/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const KEY = 'scanner_settings'

export type ScannerSettings = {
  enabled: boolean
  daily_report_time?: string | null // e.g., '09:00' (24h, project timezone)
  low_stock_threshold?: number | null // e.g., 5
  price_change_threshold?: number | null // e.g., 5 (percent)
}

export async function GET(req: Request) {
  const log = loggerForRequest(req)
  try {
    const guard = await ensureAdmin()
    if (!guard.ok) {
      const r = NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }
    const s = await getSetting<ScannerSettings>(KEY, { enabled: false, daily_report_time: '09:00', low_stock_threshold: 5, price_change_threshold: 5 })
    const r = NextResponse.json({ ok: true, settings: s })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'scanner settings failed' }, { status: 500 })
    r.headers.set('x-request-id', loggerForRequest(req).requestId)
    return r
  }
}

export async function POST(req: Request) {
  const log = loggerForRequest(req)
  try {
    const guard = await ensureAdmin()
    if (!guard.ok) {
      const r = NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }
    let body: any = {}
    try { body = await req.json() } catch {}

    const next: ScannerSettings = {
      enabled: !!body.enabled,
      daily_report_time: body.daily_report_time ?? null,
      low_stock_threshold: typeof body.low_stock_threshold === 'number' ? Math.max(0, Math.floor(body.low_stock_threshold)) : null,
      price_change_threshold: typeof body.price_change_threshold === 'number' ? Math.max(0, body.price_change_threshold) : null,
    }
    await setSetting(KEY, next)
    const r = NextResponse.json({ ok: true, settings: next })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'save failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
