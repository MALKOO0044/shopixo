import { NextResponse } from 'next/server'
import type { PricedProduct } from '@/components/admin/import/preview/types'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { loggerForRequest } from '@/lib/log'
import { finishJob, getJob, patchJob, startJob, upsertJobItemByPid } from '@/lib/jobs'
import {
  buildDiscoverRunPayload,
  buildDiscoverSearchParams,
  isDiscoverRunJob,
  normalizeDiscoverRunParams,
} from '@/lib/discover/runs'
import { normalizeCjProductId } from '@/lib/import/normalization'
import { getSetting } from '@/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const DISCOVER_DELETED_PIDS_KEY = 'discover_deleted_pids'

type SearchBatchResponse = {
  ok?: boolean
  error?: string
  quotaExhausted?: boolean
  products?: PricedProduct[]
  shortfallReason?: string
  batch?: {
    hasMore?: boolean
    cursor?: string
    attemptedPids?: string[]
  }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}

async function loadDeletedPidSet(extraDeletedPids?: unknown): Promise<Set<string>> {
  const out = new Set<string>()

  const pushPid = (rawPid: unknown) => {
    const normalized = normalizeCjProductId(rawPid)
    if (normalized) out.add(normalized)
  }

  const persisted = await getSetting<unknown>(DISCOVER_DELETED_PIDS_KEY, [])
  if (Array.isArray(persisted)) {
    for (const rawPid of persisted) pushPid(rawPid)
  }

  if (Array.isArray(extraDeletedPids)) {
    for (const rawPid of extraDeletedPids) pushPid(rawPid)
  }

  return out
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

    const jobState = await getJob(id)
    if (!jobState?.job || !isDiscoverRunJob(jobState.job)) {
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

    const deletedPidSet = await loadDeletedPidSet(body?.deletedPids)

    if (jobState.job.status === 'success' || jobState.job.status === 'error' || jobState.job.status === 'canceled') {
      const payload = buildDiscoverRunPayload(jobState, undefined, { excludedPids: deletedPidSet })
      const r = NextResponse.json({ ok: true, ...payload }, { headers: { 'Cache-Control': 'no-store' } })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const maxDurationMs = clamp(Number(body?.maxDurationMs ?? 7000), 1500, 9000)
    const maxBatches = clamp(Number(body?.maxBatches ?? 2), 1, 12)

    if (jobState.job.status === 'pending') {
      await startJob(id)
    }

    const params = normalizeDiscoverRunParams(jobState.job.params || {})
    const existingProducts = params.state.resultPids.length === 0
      ? (buildDiscoverRunPayload(jobState, undefined, { excludedPids: deletedPidSet }).products || [])
      : []

    const seenPids = new Set<string>(params.state.seenPids)
    const resultPids = new Set<string>()

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

    const startedAt = Date.now()

    while (params.state.hasMore && resultPids.size < params.filters.quantity) {
      if (batchesRunNow >= maxBatches) break
      if (Date.now() - startedAt >= maxDurationMs) break

      const remainingNeeded = Math.max(0, params.filters.quantity - resultPids.size)
      if (remainingNeeded <= 0) break

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
          params.state.lastError = 'CJ Dropshipping API limit reached. Showing products found so far.'
          params.state.hasMore = false
          break
        }
        fatalError = data?.error || `search-and-price failed (${searchRes.status})`
        break
      }

      batchesRunNow++
      params.state.batchNumber += 1

      const batchProducts = Array.isArray(data.products) ? data.products : []
      let addedThisBatch = 0

      for (const product of batchProducts) {
        const normalizedPid = normalizeCjProductId(product?.pid)
        if (!normalizedPid) continue

        seenPids.add(normalizedPid)
        if (deletedPidSet.has(normalizedPid)) continue
        if (resultPids.has(normalizedPid)) continue

        resultPids.add(normalizedPid)
        addedThisBatch++
        addedNow++

        const saved = await upsertJobItemByPid(id, normalizedPid, {
          status: 'success',
          step: 'discover_result',
          result: product,
        })
        if (!saved?.id) {
          fatalError = `Failed to persist discover product ${normalizedPid}`
          break
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
      Boolean(fatalError)

    if (fatalError) {
      await finishJob(id, 'error', totals, fatalError)
    } else if (isDone) {
      await finishJob(id, 'success', totals)
    }

    const refreshed = await getJob(id)
    if (!refreshed?.job) {
      const r = NextResponse.json({ ok: false, error: 'Failed to reload discover run state' }, { status: 500 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const latestDeletedPidSet = await loadDeletedPidSet(body?.deletedPids)
    const payload = buildDiscoverRunPayload(refreshed, undefined, { excludedPids: latestDeletedPidSet })
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
    const r = NextResponse.json({ ok: false, error: e?.message || 'discover run step failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
