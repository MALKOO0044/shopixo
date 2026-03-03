import { NextResponse } from 'next/server'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { loggerForRequest } from '@/lib/log'
import { getJob } from '@/lib/jobs'
import { buildDiscoverRunPayload, isDiscoverRunJob } from '@/lib/discover/runs'
import { getSetting } from '@/lib/settings'
import { normalizeCjProductId } from '@/lib/import/normalization'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const DISCOVER_DELETED_PIDS_KEY = 'discover_deleted_pids'

async function loadDeletedPidSet(): Promise<Set<string>> {
  const out = new Set<string>()
  const raw = await getSetting<unknown>(DISCOVER_DELETED_PIDS_KEY, [])
  if (!Array.isArray(raw)) return out

  for (const pid of raw) {
    const normalized = normalizeCjProductId(pid)
    if (normalized) out.add(normalized)
  }

  return out
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const log = loggerForRequest(req)
  try {
    const guard = await ensureAdmin()
    if (!guard.ok) {
      const r = NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const id = Number(ctx.params.id)
    if (!Number.isFinite(id) || id <= 0) {
      const r = NextResponse.json({ ok: false, error: 'Invalid id' }, { status: 400 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const jobState = await getJob(id)
    if (!jobState?.job || !isDiscoverRunJob(jobState.job)) {
      const r = NextResponse.json({ ok: false, error: 'Discover run not found' }, { status: 404 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const { searchParams } = new URL(req.url)
    const limitParam = Number(searchParams.get('limit') || NaN)
    const deletedPidSet = await loadDeletedPidSet()
    const payload = buildDiscoverRunPayload(
      jobState,
      Number.isFinite(limitParam) ? limitParam : undefined,
      { excludedPids: deletedPidSet }
    )

    const r = NextResponse.json(
      {
        ok: true,
        ...payload,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'discover run load failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
