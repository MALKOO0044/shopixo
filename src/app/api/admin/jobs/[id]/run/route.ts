import { NextResponse } from 'next/server'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { loggerForRequest } from '@/lib/log'
import { getJob, startJob, finishJob } from '@/lib/jobs'
import { isDiscoverRunJob } from '@/lib/discover/runs'
import { runJob, stepFinderJob } from '@/lib/runner'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: Request, ctx: { params: { id: string } }) {
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
    let body: any = {}
    try { body = await req.json() } catch {}
    const mode = (body?.mode || 'step') as 'step' | 'all'
    const maxSteps = Math.max(1, Math.min(200, Number(body?.steps || 1)))

    const st = await getJob(id)
    if (!st) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })

    if (isDiscoverRunJob(st.job)) {
      const origin = new URL(req.url).origin
      const forwardCookie = req.headers.get('cookie') || ''
      const discoverRes = await fetch(`${origin}/api/admin/cj/discover-runs/${id}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(forwardCookie ? { cookie: forwardCookie } : {}),
        },
        body: JSON.stringify({
          maxDurationMs: mode === 'all' ? 8000 : 4000,
          maxBatches: mode === 'all' ? 6 : Math.max(1, Math.min(3, maxSteps)),
        }),
        cache: 'no-store',
      })

      const discoverData = await discoverRes.json()
      const runStatus = String(discoverData?.run?.status || '')
      const done = Boolean(discoverData?.done) || runStatus === 'success' || runStatus === 'error' || runStatus === 'canceled'
      const processed = Number(discoverData?.run?.progress?.found || 0)
      const ok = Boolean(discoverRes.ok && discoverData?.ok)

      const r = NextResponse.json({
        ok,
        done,
        kind: 'discover',
        processed,
        error: ok ? null : (discoverData?.error || `HTTP ${discoverRes.status}`),
      }, { status: ok ? 200 : discoverRes.status || 500 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    if (st.job.kind !== 'finder') {
      const result = await runJob(id)
      const r = NextResponse.json({
        ok: result.ok,
        done: true,
        kind: st.job.kind,
        processed: result.processed || 0,
        error: result.error || null,
      }, { status: result.ok ? 200 : 500 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    if (st.job.status === 'pending') await startJob(id)

    let stepsRun = 0
    let candidatesAddedTotal = 0
    let done = false

    const safety = mode === 'all' ? 2000 : maxSteps
    for (let i = 0; i < safety; i++) {
      const res = await stepFinderJob(id)
      stepsRun++
      candidatesAddedTotal += res.added
      if (res.done) { done = true; break }
      if (mode === 'step' && stepsRun >= maxSteps) break
    }

    if (done) {
      // ensure job is success (stepFinderJob finalizes, but be safe)
      try { await finishJob(id, 'success', { stepsRun, candidatesAddedTotal }) } catch {}
    }

    const r = NextResponse.json({ ok: true, done, stepsRun, candidatesAddedTotal })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'run failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
