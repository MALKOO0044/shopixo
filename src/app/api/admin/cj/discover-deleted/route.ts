import { NextResponse } from 'next/server'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { loggerForRequest } from '@/lib/log'
import {
  addDiscoverDeletedPids,
  backfillDiscoverDeletedPidsTableFromLegacy,
  loadDiscoverDeletedPids,
  removeDiscoverDeletedPids,
} from '@/lib/discover/deleted-pids'

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

    await backfillDiscoverDeletedPidsTableFromLegacy()
    const deletedPids = await loadDiscoverDeletedPids({ includeLegacyPids: true })
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

    let body: any = {}
    try {
      body = await req.json()
    } catch {}

    await backfillDiscoverDeletedPidsTableFromLegacy()
    const saved = await addDiscoverDeletedPids(
      Array.isArray(body?.pids) ? body.pids : [body?.pid],
      {
        deletedBy: String((guard as any)?.user?.email || '').trim() || null,
        reason: typeof body?.reason === 'string' ? body.reason.trim() || null : null,
      }
    )
    if (!saved.ok) {
      const status = saved.error === 'No valid pid provided' ? 400 : 500
      const r = NextResponse.json({ ok: false, error: saved.error || 'Failed to persist deleted products' }, { status })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const r = NextResponse.json({
      ok: true,
      deletedPids: saved.deletedPids,
      added: saved.added,
      count: saved.count,
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

    let body: any = {}
    try {
      body = await req.json()
    } catch {}

    await backfillDiscoverDeletedPidsTableFromLegacy()
    const saved = await removeDiscoverDeletedPids(Array.isArray(body?.pids) ? body.pids : [body?.pid])
    if (!saved.ok) {
      const status = saved.error === 'No valid pid provided' ? 400 : 500
      const r = NextResponse.json({ ok: false, error: saved.error || 'Failed to update deleted products' }, { status })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const r = NextResponse.json({
      ok: true,
      deletedPids: saved.deletedPids,
      removed: saved.removed,
      count: saved.count,
    })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'discover deleted update failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
