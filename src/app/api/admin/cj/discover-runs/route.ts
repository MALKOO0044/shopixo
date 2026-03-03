import { NextResponse } from 'next/server'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { loggerForRequest } from '@/lib/log'
import { createJob } from '@/lib/jobs'
import { createDiscoverRunParams, normalizeDiscoverRunFilters } from '@/lib/discover/runs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

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
    } catch {
      body = {}
    }

    const filters = normalizeDiscoverRunFilters(body)
    if (!filters) {
      const r = NextResponse.json(
        { ok: false, error: 'At least one valid category or feature is required.' },
        { status: 400 }
      )
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const params = createDiscoverRunParams(filters, body?.seenPids)
    let created = await createJob('discover', params)
    let compatibilityMode = false

    // Backward compatibility: older DBs may not yet allow kind='discover'.
    // Fall back to finder-kind jobs with an explicit marker so discover routes can still run.
    if (!created?.id) {
      created = await createJob('finder', { ...params, __discoverCompat: true })
      compatibilityMode = Boolean(created?.id)
    }

    if (!created?.id) {
      const r = NextResponse.json(
        {
          ok: false,
          error:
            'Failed to create discover run job. Ensure SUPABASE_SERVICE_ROLE_KEY is set and admin_jobs/admin_job_items tables exist. If your DB is old, apply the discover job-kind migration.',
        },
        { status: 500 }
      )
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const r = NextResponse.json(
      {
        ok: true,
        runId: created.id,
        filters,
        compatibilityMode,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'discover run create failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
