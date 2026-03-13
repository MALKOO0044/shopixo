import { NextResponse } from 'next/server'
import type { PricedProduct } from '@/components/admin/import/preview/types'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { loggerForRequest } from '@/lib/log'
import { cancelJob, finishJob, getJob, getJobMeta, listJobsByKindsAndStatuses, patchJob, startJob, upsertJobItemsByPidBulk } from '@/lib/jobs'
import {
  buildDiscoverRunPayload,
  buildDiscoverSearchParams,
  DISCOVER_QUEUE_COUNTDOWN_MS,
  DISCOVER_QUEUE_HEARTBEAT_TIMEOUT_MS,
  DISCOVER_QUEUE_NOTIFICATION_LEAD_MS,
  type DiscoverRunParams,
  isDiscoverRunJob,
  normalizeDiscoverRunParams,
} from '@/lib/discover/runs'
import { loadDiscoverDeletedPidSet } from '@/lib/discover/deleted-pids'
import { normalizeCjProductId } from '@/lib/import/normalization'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type SearchBatchResponse = {
  ok?: boolean
  error?: string
  quotaExhausted?: boolean
  stopReason?: string
  products?: PricedProduct[]
  shortfallReason?: string
  batch?: {
    hasMore?: boolean
    cursor?: string
    attemptedPids?: string[]
  }
}

type QueueResponsePayload = {
  state: string
  position: number | null
  total: number
  isHead: boolean
  countdownEndsAt: string | null
  countdownRemainingMs: number
  heartbeatTimeoutMs: number
  notificationLeadMs: number
}

const QUEUE_HEARTBEAT_WRITE_INTERVAL_MS = 15_000
const QUEUE_INACTIVE_CANCEL_MESSAGE = 'Search canceled because the browser tab was closed or became inactive.'
function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}

function toTimestampMs(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : null
}

function normalizeClientSessionId(value: unknown): string | null {
  const normalized = String(value ?? '').trim()
  return normalized ? normalized.slice(0, 200) : null
}

function buildRunProgressFromParams(params: DiscoverRunParams) {
  const found = params.state.resultPids.length
  const target = params.filters.quantity
  return {
    found,
    target,
    remaining: Math.max(0, target - found),
    seenPids: params.state.seenPids.length,
    batches: params.state.batchNumber,
    cursor: params.state.cursor,
    hasMore: params.state.hasMore,
  }
}

function buildQueuePayload(input: {
  state: string
  position: number | null
  total: number
  isHead: boolean
  countdownEndsAt: string | null
  countdownRemainingMs: number
}): QueueResponsePayload {
  return {
    state: input.state,
    position: Number.isFinite(Number(input.position)) ? Number(input.position) : null,
    total: Math.max(0, Math.floor(Number(input.total) || 0)),
    isHead: Boolean(input.isHead),
    countdownEndsAt: input.countdownEndsAt || null,
    countdownRemainingMs: Math.max(0, Math.floor(Number(input.countdownRemainingMs) || 0)),
    heartbeatTimeoutMs: DISCOVER_QUEUE_HEARTBEAT_TIMEOUT_MS,
    notificationLeadMs: DISCOVER_QUEUE_NOTIFICATION_LEAD_MS,
  }
}

async function listActiveDiscoverQueueJobs(): Promise<any[]> {
  const rows = await listJobsByKindsAndStatuses(['discover', 'finder'], ['pending', 'running'], {
    ascending: true,
    limit: 2000,
  })
  return rows.filter((row) => isDiscoverRunJob(row))
}

async function cancelInactiveDiscoverQueueJobs(activeJobs: any[], nowMs: number): Promise<Set<number>> {
  const canceledIds = new Set<number>()
  for (const row of activeJobs) {
    const jobId = Number(row?.id)
    if (!Number.isFinite(jobId) || jobId <= 0) continue

    const params = normalizeDiscoverRunParams(row?.params || {})
    const queue = params.queue
    const referenceMs =
      toTimestampMs(queue.lastHeartbeatAt) ??
      toTimestampMs(row?.started_at) ??
      toTimestampMs(row?.created_at) ??
      toTimestampMs(queue.enqueuedAt)

    if (referenceMs !== null && nowMs - referenceMs <= DISCOVER_QUEUE_HEARTBEAT_TIMEOUT_MS) {
      continue
    }

    const canceled = await cancelJob(jobId)
    if (!canceled) continue

    params.queue.queueState = 'canceled_inactive'
    params.queue.lastQueueTransitionAt = new Date(nowMs).toISOString()
    params.state.lastError = params.state.lastError || QUEUE_INACTIVE_CANCEL_MESSAGE
    await patchJob(jobId, {
      params,
      error_text: QUEUE_INACTIVE_CANCEL_MESSAGE,
    })
    canceledIds.add(jobId)
  }
  return canceledIds
}

function resolveRunFoundCount(row: any): number {
  const totalsFound = Number((row?.totals as any)?.found)
  if (Number.isFinite(totalsFound) && totalsFound >= 0) {
    return Math.floor(totalsFound)
  }

  const params = normalizeDiscoverRunParams(row?.params || {})
  return params.state.resultPids.length
}

async function shouldRequireQueueCountdownForHeadRun(currentJobId: number, enqueuedAtMs: number | null): Promise<boolean> {
  if (enqueuedAtMs === null) return false

  const terminalRows = await listJobsByKindsAndStatuses(['discover', 'finder'], ['success', 'error', 'canceled'], {
    ascending: false,
    limit: 500,
  })

  for (const row of terminalRows) {
    if (!isDiscoverRunJob(row)) continue

    const rowId = Number(row?.id)
    if (!Number.isFinite(rowId) || rowId <= 0 || rowId === currentJobId) continue

    const finishedMs =
      toTimestampMs(row?.finished_at) ??
      toTimestampMs(row?.started_at) ??
      toTimestampMs(row?.created_at)

    if (finishedMs === null || finishedMs <= enqueuedAtMs) continue

    return resolveRunFoundCount(row) > 0
  }

  return false
}

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

    let jobMeta = await getJobMeta(id)
    if (!jobMeta || !isDiscoverRunJob(jobMeta)) {
      const r = NextResponse.json({ ok: false, error: 'Discover run not found' }, { status: 404 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    let body: any = {}
    try {
      body = await req.json()
    } catch {
      body = {}
    }

    if (jobMeta.status === 'success' || jobMeta.status === 'error' || jobMeta.status === 'canceled') {
      const terminalState = await getJob(id)
      if (!terminalState?.job) {
        const r = NextResponse.json({ ok: false, error: 'Discover run not found' }, { status: 404 })
        r.headers.set('x-request-id', log.requestId)
        return r
      }

      const payload = buildDiscoverRunPayload(terminalState, undefined, { excludedPids: await loadDiscoverDeletedPidSet({ includeLegacyPids: true }) })
      const payloadQueue = (payload as any)?.queue || {}
      const r = NextResponse.json(
        {
          ok: true,
          ...payload,
          queue: {
            ...payloadQueue,
            ...buildQueuePayload({
              state: String(payloadQueue.state || 'waiting_turn'),
              position: null,
              total: 0,
              isHead: false,
              countdownEndsAt: payloadQueue.countdownEndsAt || null,
              countdownRemainingMs: 0,
            }),
          },
        },
        { headers: { 'Cache-Control': 'no-store' } }
      )
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const deletedPidSet = await loadDiscoverDeletedPidSet({
      extraPids: body?.deletedPids,
      includeLegacyPids: true,
    })

    const maxDurationMs = clamp(Number(body?.maxDurationMs ?? 7000), 1500, 9000)
    const maxBatches = clamp(Number(body?.maxBatches ?? 2), 1, 24)

    const params = normalizeDiscoverRunParams(jobMeta.params || {})
    const nowMs = Date.now()
    const nowIso = new Date(nowMs).toISOString()
    const incomingClientSessionId = normalizeClientSessionId(body?.clientSessionId)
    let queueMetaChanged = false

    if (!params.queue.enqueuedAt) {
      params.queue.enqueuedAt = nowIso
      queueMetaChanged = true
    }
    if (!params.queue.lastQueueTransitionAt) {
      params.queue.lastQueueTransitionAt = nowIso
      queueMetaChanged = true
    }
    if (incomingClientSessionId && incomingClientSessionId !== params.queue.clientSessionId) {
      params.queue.clientSessionId = incomingClientSessionId
      queueMetaChanged = true
    }
    const lastHeartbeatMs = toTimestampMs(params.queue.lastHeartbeatAt)
    if (!lastHeartbeatMs || nowMs - lastHeartbeatMs >= QUEUE_HEARTBEAT_WRITE_INTERVAL_MS || queueMetaChanged) {
      params.queue.lastHeartbeatAt = nowIso
      queueMetaChanged = true
    }
    if (queueMetaChanged) {
      await patchJob(id, { params })
      jobMeta = (await getJobMeta(id)) || jobMeta
    }

    let activeQueue = await listActiveDiscoverQueueJobs()
    const staleCanceledIds = await cancelInactiveDiscoverQueueJobs(activeQueue, nowMs)
    if (staleCanceledIds.size > 0) {
      activeQueue = await listActiveDiscoverQueueJobs()
    }

    const queueIndex = activeQueue.findIndex((entry) => Number(entry?.id) === id)
    if (queueIndex < 0) {
      const latestState = await getJob(id)
      if (!latestState?.job || !isDiscoverRunJob(latestState.job)) {
        const r = NextResponse.json({ ok: false, error: 'Discover run not found' }, { status: 404 })
        r.headers.set('x-request-id', log.requestId)
        return r
      }
      const payload = buildDiscoverRunPayload(latestState, undefined, { excludedPids: deletedPidSet })
      const payloadQueue = (payload as any)?.queue || {}
      const r = NextResponse.json(
        {
          ok: true,
          ...payload,
          queue: {
            ...payloadQueue,
            ...buildQueuePayload({
              state: String(payloadQueue.state || 'waiting_turn'),
              position: null,
              total: 0,
              isHead: false,
              countdownEndsAt: payloadQueue.countdownEndsAt || null,
              countdownRemainingMs: 0,
            }),
          },
        },
        { headers: { 'Cache-Control': 'no-store' } }
      )
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const queueTotal = activeQueue.length
    const isQueueHead = queueIndex === 0

    if (!isQueueHead) {
      let waitingPatchNeeded = false
      if (params.queue.queueState !== 'waiting_turn') {
        params.queue.queueState = 'waiting_turn'
        params.queue.lastQueueTransitionAt = nowIso
        waitingPatchNeeded = true
      }
      if (params.queue.countdownStartedAt || params.queue.countdownEndsAt) {
        params.queue.countdownStartedAt = null
        params.queue.countdownEndsAt = null
        waitingPatchNeeded = true
      }

      const statusPatch = jobMeta.status === 'running' ? 'pending' : undefined
      if (waitingPatchNeeded || statusPatch) {
        await patchJob(id, {
          params,
          ...(statusPatch ? { status: statusPatch } : {}),
        })
      }

      const waitingProgress = buildRunProgressFromParams(params)
      const responsePayload = {
        ok: true,
        done: false,
        stopReason: 'queued_waiting_turn',
        shortfallReason: null,
        quotaExhausted: params.state.quotaExhausted,
        run: {
          id,
          status: statusPatch || String(jobMeta.status || 'pending'),
          progress: waitingProgress,
        },
        queue: buildQueuePayload({
          state: 'waiting_turn',
          position: queueIndex + 1,
          total: queueTotal,
          isHead: false,
          countdownEndsAt: null,
          countdownRemainingMs: 0,
        }),
        debug: {
          queueGate: {
            queueIndex,
            queueTotal,
            staleCanceledIds: Array.from(staleCanceledIds),
          },
        },
        products: [],
        newProducts: [],
        totalProducts: waitingProgress.found,
      }
      const r = NextResponse.json(responsePayload, { headers: { 'Cache-Control': 'no-store' } })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const enqueuedAtMs = toTimestampMs(params.queue.enqueuedAt)
    const countdownRequired = await shouldRequireQueueCountdownForHeadRun(id, enqueuedAtMs)

    if (params.queue.queueState !== 'running') {
      if (!countdownRequired) {
        params.queue.queueState = 'running'
        params.queue.countdownStartedAt = null
        params.queue.countdownEndsAt = null

        params.queue.lastQueueTransitionAt = nowIso
        await patchJob(id, { params })
      } else {
        let countdownEndsMs = toTimestampMs(params.queue.countdownEndsAt)
        if (!countdownEndsMs) {
          params.queue.queueState = 'countdown'
          params.queue.countdownStartedAt = nowIso
          params.queue.countdownEndsAt = new Date(nowMs + DISCOVER_QUEUE_COUNTDOWN_MS).toISOString()
          params.queue.lastQueueTransitionAt = nowIso
          await patchJob(id, { params, ...(jobMeta.status === 'running' ? { status: 'pending' as const } : {}) })
          countdownEndsMs = toTimestampMs(params.queue.countdownEndsAt)
        }

        const countdownRemainingMs = Math.max(0, Number(countdownEndsMs || 0) - nowMs)
        if (countdownRemainingMs > 0) {
          const waitingProgress = buildRunProgressFromParams(params)
          const responsePayload = {
            ok: true,
            done: false,
            stopReason: 'queued_countdown',
            shortfallReason: null,
            quotaExhausted: params.state.quotaExhausted,
            run: {
              id,
              status: 'pending',
              progress: waitingProgress,
            },
            queue: buildQueuePayload({
              state: 'countdown',
              position: 1,
              total: queueTotal,
              isHead: true,
              countdownEndsAt: params.queue.countdownEndsAt,
              countdownRemainingMs,
            }),
            debug: {
              queueGate: {
                queueIndex,
                queueTotal,
                staleCanceledIds: Array.from(staleCanceledIds),
                countdownRequired,
              },
            },
            products: [],
            newProducts: [],
            totalProducts: waitingProgress.found,
          }
          const r = NextResponse.json(responsePayload, { headers: { 'Cache-Control': 'no-store' } })
          r.headers.set('x-request-id', log.requestId)
          return r
        }

        params.queue.queueState = 'running'
        params.queue.countdownStartedAt = null
        params.queue.countdownEndsAt = null
        params.queue.lastQueueTransitionAt = nowIso
        await patchJob(id, { params })
      }
    }

    if (jobMeta.status === 'pending') {
      await startJob(id)
      jobMeta = { ...jobMeta, status: 'running' }
    }

    let existingProducts: PricedProduct[] = []
    if (params.state.resultPids.length === 0 && Number(jobMeta?.totals?.found || 0) > 0) {
      const hydratedState = await getJob(id)
      if (hydratedState?.job) {
        existingProducts = buildDiscoverRunPayload(hydratedState, undefined, { excludedPids: deletedPidSet }).products || []
      }
    }

    const seenPids = new Set<string>(params.state.seenPids)
    const resultPids = new Set<string>()
    const newProductsThisStep: PricedProduct[] = []

    for (const deletedPid of deletedPidSet) {
      seenPids.add(deletedPid)
    }

    for (const rawPid of params.state.resultPids) {
      const normalizedPid = normalizeCjProductId(rawPid)
      if (!normalizedPid || deletedPidSet.has(normalizedPid)) continue
      resultPids.add(normalizedPid)
    }

    for (const product of existingProducts) {
      const normalizedPid = normalizeCjProductId(product?.pid)
      if (!normalizedPid) continue
      resultPids.add(normalizedPid)
      seenPids.add(normalizedPid)
    }

    const searchBaseUrl = new URL('/api/admin/cj/products/search-and-price', new URL(req.url)).toString()
    const forwardedCookie = req.headers.get('cookie') || ''

    let batchesRunNow = 0
    let addedNow = 0
    let fatalError: string | null = null
    let canceledByAdmin = false
    let latestBatchStopReason: string | null = null
    let stepStopReason: string | null = null

    const startedAt = Date.now()

    while (params.state.hasMore && resultPids.size < params.filters.quantity) {
      const latestJobMeta = await getJobMeta(id)
      if (latestJobMeta?.status === 'canceled') {
        canceledByAdmin = true
        stepStopReason = 'admin_canceled'
        params.state.hasMore = false
        break
      }

      if (batchesRunNow >= maxBatches) {
        stepStopReason = 'step_batch_budget_reached'
        break
      }
      if (Date.now() - startedAt >= maxDurationMs) {
        stepStopReason = 'step_runtime_budget_reached'
        break
      }

      const remainingNeeded = Math.max(0, params.filters.quantity - resultPids.size)
      if (remainingNeeded <= 0) {
        stepStopReason = 'fulfilled'
        break
      }

      const query = buildDiscoverSearchParams(params.filters, params.state, remainingNeeded)
      const searchRes = await fetch(`${searchBaseUrl}?${query.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(forwardedCookie ? { cookie: forwardedCookie } : {}),
          'x-discover-run-id': String(id),
        },
        body: JSON.stringify({ seenPids: Array.from(seenPids) }),
        cache: 'no-store',
      })

      const contentType = searchRes.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        const text = await searchRes.text()
        fatalError = `Discover run failed: non-JSON response (${text.slice(0, 120)})`
        break
      }

      const data = (await searchRes.json()) as SearchBatchResponse
      if (!searchRes.ok || !data?.ok) {
        if (data?.quotaExhausted || searchRes.status === 429) {
          params.state.quotaExhausted = true
          stepStopReason = 'upstream_quota_exhausted'
          params.state.lastError = 'CJ Dropshipping API limit reached. Showing products found so far.'
          params.state.hasMore = false
          break
        }
        stepStopReason = 'upstream_error'
        fatalError = data?.error || `search-and-price failed (${searchRes.status})`
        break
      }

      if (typeof data.stopReason === 'string' && data.stopReason.trim()) {
        latestBatchStopReason = data.stopReason.trim()
      }

      const postFetchJobMeta = await getJobMeta(id)
      if (postFetchJobMeta?.status === 'canceled') {
        canceledByAdmin = true
        stepStopReason = 'admin_canceled'
        params.state.hasMore = false
        break
      }

      batchesRunNow++
      params.state.batchNumber += 1

      const batchProducts = Array.isArray(data.products) ? data.products : []
      let addedThisBatch = 0

      const pendingUpserts = new Map<string, PricedProduct>()

      for (const product of batchProducts) {
        const normalizedPid = normalizeCjProductId(product?.pid)
        if (!normalizedPid) continue

        seenPids.add(normalizedPid)
        if (deletedPidSet.has(normalizedPid)) continue
        if (resultPids.has(normalizedPid)) continue
        if (pendingUpserts.has(normalizedPid)) continue

        pendingUpserts.set(normalizedPid, product)
      }

      const upsertEntries = Array.from(pendingUpserts.entries())
      if (upsertEntries.length > 0) {
        const saveResult = await upsertJobItemsByPidBulk(
          id,
          upsertEntries.map(([normalizedPid, product]) => ({
            cj_product_id: normalizedPid,
            status: 'success',
            step: 'discover_result',
            result: product,
          })),
          { chunkSize: 120 }
        )

        if (!saveResult.ok) {
          fatalError = `Failed to persist discover products (${saveResult.failedPids.length} failed)`
        } else {
          for (const [normalizedPid, product] of upsertEntries) {
            resultPids.add(normalizedPid)
            addedThisBatch++
            addedNow++
            newProductsThisStep.push(product)
          }
        }
      }

      if (fatalError) break

      if (Array.isArray(data.batch?.attemptedPids)) {
        for (const attemptedPid of data.batch.attemptedPids) {
          const normalizedPid = normalizeCjProductId(attemptedPid)
          if (normalizedPid) seenPids.add(normalizedPid)
        }
      }

      if (typeof data.shortfallReason === 'string' && data.shortfallReason.trim()) {
        params.state.lastShortfallReason = data.shortfallReason.trim()
      }

      if (typeof data.batch?.cursor === 'string' && data.batch.cursor.trim()) {
        params.state.cursor = data.batch.cursor.trim()
      }
      params.state.hasMore = Boolean(data.batch?.hasMore)

      if (addedThisBatch === 0) {
        params.state.consecutiveEmptyBatches += 1
      } else {
        params.state.consecutiveEmptyBatches = 0
      }

      const attemptedCount = Array.isArray(data.batch?.attemptedPids) ? data.batch.attemptedPids.length : 0
      if (addedThisBatch === 0 && attemptedCount === 0 && !params.state.hasMore) {
        stepStopReason = latestBatchStopReason || 'source_exhausted'
        break
      }
    }

    params.state.seenPids = Array.from(seenPids)
    params.state.resultPids = Array.from(resultPids)

    if (fatalError) {
      params.state.lastError = fatalError
    }

    const totals = {
      found: resultPids.size,
      target: params.filters.quantity,
      seenPids: seenPids.size,
      batches: params.state.batchNumber,
      batchesRunNow,
      addedNow,
      quotaExhausted: params.state.quotaExhausted,
    }

    await patchJob(id, {
      params,
      totals,
    })

    const isDone =
      resultPids.size >= params.filters.quantity ||
      !params.state.hasMore ||
      params.state.quotaExhausted ||
      canceledByAdmin ||
      Boolean(fatalError)

    const elapsedMs = Date.now() - startedAt
    const resolvedStopReason =
      stepStopReason ||
      (resultPids.size >= params.filters.quantity
        ? 'fulfilled'
        : params.state.quotaExhausted
          ? 'upstream_quota_exhausted'
          : canceledByAdmin
            ? 'admin_canceled'
            : fatalError
              ? 'fatal_error'
              : !params.state.hasMore
                ? latestBatchStopReason || 'source_exhausted'
                : elapsedMs >= maxDurationMs
                  ? 'step_runtime_budget_reached'
                  : batchesRunNow >= maxBatches
                    ? 'step_batch_budget_reached'
                    : latestBatchStopReason || 'running')

    let responseStatus = 'running'

    if (fatalError) {
      await finishJob(id, 'error', totals, fatalError)
      responseStatus = 'error'
    } else if (canceledByAdmin) {
      responseStatus = 'canceled'
    } else if (isDone) {
      await finishJob(id, 'success', totals)
      responseStatus = 'success'
    }

    const shortfallReason =
      isDone && resultPids.size < params.filters.quantity
        ? (canceledByAdmin
            ? 'Search stopped by admin request. Showing products found so far.'
            : params.state.lastError) ||
          params.state.lastShortfallReason ||
          `Found ${resultPids.size}/${params.filters.quantity} products. Not enough matching products in this category.`
        : null

    const responsePayload = {
      ok: true,
      done: isDone,
      stopReason: resolvedStopReason,
      shortfallReason,
      quotaExhausted: params.state.quotaExhausted,
      run: {
        id,
        status: responseStatus,
        progress: {
          found: resultPids.size,
          target: params.filters.quantity,
          remaining: Math.max(0, params.filters.quantity - resultPids.size),
          seenPids: params.state.seenPids.length,
          batches: params.state.batchNumber,
          cursor: params.state.cursor,
          hasMore: params.state.hasMore,
        },
      },
      queue: buildQueuePayload({
        state: responseStatus === 'running' ? 'running' : params.queue.queueState,
        position: responseStatus === 'running' ? 1 : null,
        total: responseStatus === 'running' ? queueTotal : Math.max(0, queueTotal - 1),
        isHead: responseStatus === 'running',
        countdownEndsAt: null,
        countdownRemainingMs: 0,
      }),
      debug: {
        budgets: {
          maxDurationMs,
          maxBatches,
        },
        elapsedMs,
        batchesRunNow,
        addedNow,
        latestBatchStopReason,
        queueGate: {
          queueIndex,
          queueTotal,
          staleCanceledIds: Array.from(staleCanceledIds),
        },
      },
      // Keep products for compatibility with existing clients, but return only incremental deltas.
      products: newProductsThisStep,
      newProducts: newProductsThisStep,
      totalProducts: resultPids.size,
    }

    const r = NextResponse.json(responsePayload, { headers: { 'Cache-Control': 'no-store' } })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'discover run step failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}

