import { NextResponse } from 'next/server'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { loggerForRequest } from '@/lib/log'
import { getJob, listJobsByKindsAndStatuses } from '@/lib/jobs'
import {
  buildDiscoverRunPayload,
  DISCOVER_QUEUE_HEARTBEAT_TIMEOUT_MS,
  DISCOVER_QUEUE_NOTIFICATION_LEAD_MS,
  isDiscoverRunJob,
  normalizeDiscoverRunParams,
} from '@/lib/discover/runs'
import { loadDiscoverDeletedPidSet } from '@/lib/discover/deleted-pids'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function toTimestampMs(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
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
    const deletedPidSet = await loadDiscoverDeletedPidSet({ includeLegacyPids: true })
    const payload = buildDiscoverRunPayload(
      jobState,
      Number.isFinite(limitParam) ? limitParam : undefined,
      { excludedPids: deletedPidSet }
    )

    const terminal =
      String(jobState.job?.status || '') === 'success' ||
      String(jobState.job?.status || '') === 'error' ||
      String(jobState.job?.status || '') === 'canceled'

    let position: number | null = null
    let total = 0
    let isHead = false
    let countdownRemainingMs = 0

    if (!terminal) {
      const activeQueueRows = await listJobsByKindsAndStatuses(['discover', 'finder'], ['pending', 'running'], {
        ascending: true,
        limit: 2000,
      })
      const activeQueue = activeQueueRows.filter((row) => isDiscoverRunJob(row))
      total = activeQueue.length
      const queueIndex = activeQueue.findIndex((row) => Number(row?.id) === id)
      if (queueIndex >= 0) {
        position = queueIndex + 1
        isHead = queueIndex === 0
      }

      const params = normalizeDiscoverRunParams(jobState.job?.params || {})
      const countdownEndsMs = toTimestampMs(params.queue.countdownEndsAt)
      if (isHead && countdownEndsMs) {
        countdownRemainingMs = Math.max(0, countdownEndsMs - Date.now())
      }

      const queueState =
        queueIndex < 0
          ? String((payload as any)?.queue?.state || 'waiting_turn')
          : isHead
            ? countdownRemainingMs > 0
              ? 'countdown'
              : String(jobState.job?.status || '') === 'running'
                ? 'running'
                : String(params.queue.queueState || 'waiting_turn')
            : 'waiting_turn'

      ;(payload as any).queue = {
        ...(payload as any).queue,
        state: queueState,
        position,
        total,
        isHead,
        countdownEndsAt: isHead ? (params.queue.countdownEndsAt || null) : null,
        countdownRemainingMs,
        heartbeatTimeoutMs: DISCOVER_QUEUE_HEARTBEAT_TIMEOUT_MS,
        notificationLeadMs: DISCOVER_QUEUE_NOTIFICATION_LEAD_MS,
      }
    } else {
      ;(payload as any).queue = {
        ...(payload as any).queue,
        position: null,
        total: 0,
        isHead: false,
        countdownEndsAt: (payload as any)?.queue?.countdownEndsAt || null,
        countdownRemainingMs: 0,
        heartbeatTimeoutMs: DISCOVER_QUEUE_HEARTBEAT_TIMEOUT_MS,
        notificationLeadMs: DISCOVER_QUEUE_NOTIFICATION_LEAD_MS,
      }
    }

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
