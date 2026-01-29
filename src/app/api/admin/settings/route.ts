import { NextResponse } from 'next/server'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { loggerForRequest } from '@/lib/log'
import { getOperatingMode, isKillSwitchOn, setOperatingMode, setKillSwitch } from '@/lib/settings'
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
    const [mode, kill, hasKv] = await Promise.all([
      getOperatingMode(),
      isKillSwitchOn(),
      hasTable('kv_settings'),
    ])
    const r = NextResponse.json({ ok: true, mode, killSwitch: kill, hasKv })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'settings failed' }, { status: 500 })
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
    const hasKv = await hasTable('kv_settings')
    if (!hasKv) {
      const r = NextResponse.json({ ok: false, error: 'kv_settings table missing' }, { status: 400 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }
    let body: any = {}
    try { body = await req.json() } catch {}
    const updates: Record<string, any> = {}
    if (typeof body.mode === 'string' && ['monitor','copilot','autopilot'].includes(body.mode)) {
      await setOperatingMode(body.mode)
      updates.mode = body.mode
    }
    if (typeof body.killSwitch === 'boolean') {
      await setKillSwitch(body.killSwitch)
      updates.killSwitch = body.killSwitch
    }
    const r = NextResponse.json({ ok: true, updated: updates })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'update failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
