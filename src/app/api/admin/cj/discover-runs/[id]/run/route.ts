import { NextResponse } from 'next/server'
import type { PricedProduct } from '@/components/admin/import/preview/types'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { loggerForRequest } from '@/lib/log'
import { finishJob, getJob, getJobMeta, patchJob, startJob, upsertJobItemsByPidBulk } from '@/lib/jobs'
import {
  buildDiscoverRunPayload,
  buildDiscoverSearchParams,
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

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
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

    const jobMeta = await getJobMeta(id)
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

    const deletedPidSet = await loadDiscoverDeletedPidSet({
      extraPids: body?.deletedPids,
      includeLegacyPids: true,
    })

    if (jobMeta.status === 'success' || jobMeta.status === 'error' || jobMeta.status === 'canceled') {
      const terminalState = await getJob(id)
      if (!terminalState?.job) {
        const r = NextResponse.json({ ok: false, error: 'Discover run not found' }, { status: 404 })
        r.headers.set('x-request-id', log.requestId)
        return r
      }

      const payload = buildDiscoverRunPayload(terminalState, undefined, { excludedPids: deletedPidSet })
      const r = NextResponse.json({ ok: true, ...payload }, { headers: { 'Cache-Control': 'no-store' } })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const maxDurationMs = clamp(Number(body?.maxDurationMs ?? 7000), 1500, 9000)
    const maxBatches = clamp(Number(body?.maxBatches ?? 2), 1, 24)

    if (jobMeta.status === 'pending') {
      await startJob(id)
    }

    const params = normalizeDiscoverRunParams(jobMeta.params || {})
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
      debug: {
        budgets: {
          maxDurationMs,
          maxBatches,
        },
        elapsedMs,
        batchesRunNow,
        addedNow,
        latestBatchStopReason,
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
