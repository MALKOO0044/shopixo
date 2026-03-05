import { NextResponse } from 'next/server'
import type { PricedProduct } from '@/components/admin/import/preview/types'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { loggerForRequest } from '@/lib/log'
import { finishJob, getJob, getJobMeta, patchJob, startJob, upsertJobItemByPid } from '@/lib/jobs'
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
    candidatesProcessed?: number
    candidatesDeferred?: number
    productsThisBatch?: number
    totalCandidates?: number
  }
}

const MAX_CONSECUTIVE_EMPTY_BATCHES = 14

function resolveNoProgressStopThreshold(remainingNeeded: number): number {
  if (remainingNeeded >= 1000) return 5
  if (remainingNeeded >= 300) return 4
  if (remainingNeeded >= 100) return 3
  return 2
}

function resolveCandidateOnlyStopThreshold(remainingNeeded: number): number {
  if (remainingNeeded >= 1000) return 7
  if (remainingNeeded >= 300) return 6
  if (remainingNeeded >= 100) return 5
  return 4
}

function resolveLowYieldStopThreshold(remainingNeeded: number): number {
  if (remainingNeeded >= 1000) return 6
  if (remainingNeeded >= 300) return 5
  if (remainingNeeded >= 100) return 4
  return 3
}

function isLowYieldBatch(addedThisBatch: number, attemptedCount: number): boolean {
  if (addedThisBatch <= 0 || attemptedCount < 8) return false
  const ratio = addedThisBatch / attemptedCount
  if (attemptedCount >= 18) return ratio < 0.08
  return ratio < 0.12
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

    const deletedPidSet = await loadDeletedPidSet(body?.deletedPids)

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

    const maxDurationMs = clamp(Number(body?.maxDurationMs ?? 8200), 1500, 11000)
    const maxBatches = clamp(Number(body?.maxBatches ?? 4), 1, 16)

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
    let attemptedNow = 0
    let candidateOnlyBatchesNow = 0
    let noProgressBatchesNow = 0
    let lowYieldBatchesNow = 0
    let lastAttemptedCount = 0
    let lastAddedCount = 0
    let lastCursorAdvanced = false
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

        const saved = await upsertJobItemByPid(id, normalizedPid, {
          status: 'success',
          step: 'discover_result',
          result: product,
        })
        if (!saved?.id) {
          fatalError = `Failed to persist discover product ${normalizedPid}`
          break
        }

        resultPids.add(normalizedPid)
        addedThisBatch++
        addedNow++
        newProductsThisStep.push(product)
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

      const previousCursor = params.state.cursor
      let cursorAdvanced = false
      if (typeof data.batch?.cursor === 'string' && data.batch.cursor.trim()) {
        const nextCursor = data.batch.cursor.trim()
        cursorAdvanced = nextCursor !== previousCursor
        params.state.cursor = nextCursor
      }
      params.state.hasMore = Boolean(data.batch?.hasMore)

      const attemptedCountFromResponse = Number(data.batch?.candidatesProcessed)
      const attemptedCount =
        Number.isFinite(attemptedCountFromResponse) && attemptedCountFromResponse >= 0
          ? Math.floor(attemptedCountFromResponse)
          : Array.isArray(data.batch?.attemptedPids)
            ? data.batch.attemptedPids.length
            : 0

      attemptedNow += attemptedCount
      lastAttemptedCount = attemptedCount
      lastAddedCount = addedThisBatch
      lastCursorAdvanced = cursorAdvanced

      const remainingAfterBatch = Math.max(0, params.filters.quantity - resultPids.size)
      const noProgressStopThreshold = resolveNoProgressStopThreshold(remainingAfterBatch)
      const candidateOnlyStopThreshold = resolveCandidateOnlyStopThreshold(remainingAfterBatch)
      const lowYieldStopThreshold = resolveLowYieldStopThreshold(remainingAfterBatch)

      const noBatchProgress = attemptedCount === 0 && !cursorAdvanced
      const candidateOnlyProgress = attemptedCount > 0 && addedThisBatch === 0
      const lowYieldBatch = isLowYieldBatch(addedThisBatch, attemptedCount)

      if (addedThisBatch === 0) {
        params.state.consecutiveEmptyBatches += 1
      } else {
        params.state.consecutiveEmptyBatches = 0
      }

      if (noBatchProgress) {
        params.state.consecutiveNoProgressBatches += 1
        noProgressBatchesNow += 1
      } else {
        params.state.consecutiveNoProgressBatches = 0
      }

      if (candidateOnlyProgress) {
        params.state.consecutiveCandidateOnlyBatches += 1
        candidateOnlyBatchesNow += 1
      } else {
        params.state.consecutiveCandidateOnlyBatches = 0
      }

      if (lowYieldBatch) {
        params.state.consecutiveLowYieldBatches += 1
        lowYieldBatchesNow += 1
      } else {
        params.state.consecutiveLowYieldBatches = 0
      }

      if (noBatchProgress && params.state.consecutiveNoProgressBatches >= noProgressStopThreshold) {
        params.state.hasMore = false
        if (!params.state.lastShortfallReason) {
          params.state.lastShortfallReason =
            'No additional eligible products were found after repeated no-progress batches. Try another feature or relax the filters.'
        }
        break
      }

      if (candidateOnlyProgress && params.state.consecutiveCandidateOnlyBatches >= candidateOnlyStopThreshold) {
        params.state.hasMore = false
        if (!params.state.lastShortfallReason) {
          params.state.lastShortfallReason =
            'Search is scanning candidates but not finding new eligible products. Try another feature or relax filters.'
        }
        break
      }

      if (lowYieldBatch && params.state.consecutiveLowYieldBatches >= lowYieldStopThreshold) {
        params.state.hasMore = false
        if (!params.state.lastShortfallReason) {
          params.state.lastShortfallReason =
            `Low-yield batches detected repeatedly (${addedThisBatch}/${attemptedCount} in last batch). Try another feature or relax filters.`
        }
        break
      }

      if (params.state.consecutiveEmptyBatches >= MAX_CONSECUTIVE_EMPTY_BATCHES) {
        params.state.hasMore = false
        if (!params.state.lastShortfallReason) {
          params.state.lastShortfallReason =
            'No additional eligible products were found after repeated empty batches. Try another feature or relax the filters.'
        }
        break
      }

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
      attemptedNow,
      candidateOnlyBatchesNow,
      noProgressBatchesNow,
      lowYieldBatchesNow,
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

    let responseStatus = 'running'

    if (fatalError) {
      await finishJob(id, 'error', totals, fatalError)
      responseStatus = 'error'
    } else if (isDone) {
      await finishJob(id, 'success', totals)
      responseStatus = 'success'
    }

    const shortfallReason =
      isDone && resultPids.size < params.filters.quantity
        ? params.state.lastError ||
          params.state.lastShortfallReason ||
          `Found ${resultPids.size}/${params.filters.quantity} products. Not enough matching products in this category.`
        : null

    const responsePayload = {
      ok: true,
      done: isDone,
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
          noProgressBatches: params.state.consecutiveNoProgressBatches,
          candidateOnlyBatches: params.state.consecutiveCandidateOnlyBatches,
          lowYieldBatches: params.state.consecutiveLowYieldBatches,
        },
      },
      diagnostics: {
        batchesRunNow,
        addedNow,
        attemptedNow,
        lastBatch: {
          attempted: lastAttemptedCount,
          added: lastAddedCount,
          cursorAdvanced: lastCursorAdvanced,
        },
        streaks: {
          empty: params.state.consecutiveEmptyBatches,
          noProgress: params.state.consecutiveNoProgressBatches,
          candidateOnly: params.state.consecutiveCandidateOnlyBatches,
          lowYield: params.state.consecutiveLowYieldBatches,
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
