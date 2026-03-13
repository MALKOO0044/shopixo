import { NextResponse } from 'next/server'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { loggerForRequest } from '@/lib/log'
import { getSetting, hasSettingsTable, setSetting } from '@/lib/settings'
import { normalizeCjProductId } from '@/lib/import/normalization'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const KEY = 'discover_deleted_pids'

function normalizePid(value: unknown): string {
  return normalizeCjProductId(value)
}

function normalizePidList(value: unknown): string[] {
  const out = new Set<string>()

  const push = (raw: unknown) => {
    const pid = normalizePid(raw)
    if (pid) out.add(pid)
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      push(entry)
    }
  } else if (value !== undefined && value !== null) {
    push(value)
  }

  return Array.from(out)
}

async function readDeletedPids(): Promise<string[]> {
  const current = await getSetting<unknown>(KEY, [])
  return normalizePidList(current)
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
      const r = NextResponse.json({ ok: true, deletedPids: [], tablesMissing: true }, { headers: { 'Cache-Control': 'no-store' } })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const deletedPids = await readDeletedPids()
    const r = NextResponse.json({ ok: true, deletedPids, count: deletedPids.length }, { headers: { 'Cache-Control': 'no-store' } })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'discover deleted load failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
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
      const r = NextResponse.json({ ok: false, error: 'kv_settings table missing' }, { status: 503 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    let body: any = {}
    try {
      body = await req.json()
    } catch {}

    const incoming = normalizePidList(Array.isArray(body?.pids) ? body.pids : [body?.pid])
    if (incoming.length === 0) {
      const r = NextResponse.json({ ok: false, error: 'No valid pid provided' }, { status: 400 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const current = await readDeletedPids()
    const merged = Array.from(new Set([...current, ...incoming]))

    const saved = await setSetting(KEY, merged)
    if (!saved.ok) {
      const r = NextResponse.json({ ok: false, error: 'Failed to persist deleted products' }, { status: 500 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const r = NextResponse.json({
      ok: true,
      deletedPids: merged,
      added: merged.length - current.length,
      count: merged.length,
    })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'discover deleted save failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}

export async function DELETE(req: Request) {
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
      const r = NextResponse.json({ ok: false, error: 'kv_settings table missing' }, { status: 503 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    let body: any = {}
    try {
      body = await req.json()
    } catch {}

    const toRemove = normalizePidList(Array.isArray(body?.pids) ? body.pids : [body?.pid])
    if (toRemove.length === 0) {
      const r = NextResponse.json({ ok: false, error: 'No valid pid provided' }, { status: 400 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const removeSet = new Set<string>(toRemove)
    const current = await readDeletedPids()
    const next = current.filter((pid) => !removeSet.has(pid))

    const saved = await setSetting(KEY, next)
    if (!saved.ok) {
      const r = NextResponse.json({ ok: false, error: 'Failed to update deleted products' }, { status: 500 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const r = NextResponse.json({
      ok: true,
      deletedPids: next,
      removed: current.length - next.length,
      count: next.length,
    })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'discover deleted update failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
