import { NextResponse } from 'next/server'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { loggerForRequest } from '@/lib/log'
import { hasTable } from '@/lib/db-features'

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
    const [kv, proposals, audit, policies] = await Promise.all([
      hasTable('kv_settings'),
      hasTable('proposals'),
      hasTable('audit_logs'),
      hasTable('pricing_policies'),
    ])
    const r = NextResponse.json({ ok: true, tables: { kv_settings: kv, proposals, audit_logs: audit, pricing_policies: policies } })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'db status failed' }, { status: 500 })
    r.headers.set('x-request-id', loggerForRequest(req).requestId)
    return r
  }
}
