import { NextResponse } from 'next/server'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { loggerForRequest } from '@/lib/log'
import { getSetting, setSetting, hasSettingsTable } from '@/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const KEY = 'cj_config'

type CjConfig = {
  email?: string | null
  apiKey?: string | null
  base?: string | null
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
    const tableExists = await hasSettingsTable()
    if (!tableExists) {
      const r = NextResponse.json({ 
        ok: false, 
        error: 'Database table missing. Please run migrations: kv_settings table required.',
        tablesMissing: true 
      }, { status: 503 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }
    const cfg = await getSetting<CjConfig>(KEY, { email: null, apiKey: null, base: null })
    const email = cfg?.email || null
    const base = cfg?.base || null
    const configured = !!(cfg?.email && cfg?.apiKey)
    const r = NextResponse.json({ ok: true, configured, emailPreview: email ? (email.replace(/(.{2}).+(@.*)/, '$1***$2')) : null, base })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'cj settings load failed' }, { status: 500 })
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
    const tableExists = await hasSettingsTable()
    if (!tableExists) {
      const r = NextResponse.json({ 
        ok: false, 
        error: 'Database table missing. Please run migrations: kv_settings table required.',
        tablesMissing: true 
      }, { status: 503 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }
    let body: any = {}
    try { body = await req.json() } catch {}
    const next: CjConfig = {
      email: typeof body.email === 'string' ? body.email.trim() : null,
      apiKey: typeof body.apiKey === 'string' ? body.apiKey.trim() : null,
      base: typeof body.base === 'string' ? (body.base.trim() || null) : null,
    }
    const result = await setSetting(KEY, next)
    if (!result.ok) {
      const r = NextResponse.json({ ok: false, error: 'Failed to save settings' }, { status: 500 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }
    const r = NextResponse.json({ ok: true })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'cj settings save failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
