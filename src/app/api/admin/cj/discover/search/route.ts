import { NextResponse } from 'next/server'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { loadDiscoverDeletedPids } from '@/lib/discover/deleted-pids'
import { normalizeDiscoverRunFilters } from '@/lib/discover/runs'
import { normalizeCjProductId } from '@/lib/import/normalization'
import { loggerForRequest } from '@/lib/log'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 60

function readEnv(name: string): string | undefined {
  const env = (globalThis as any)?.process?.env
  const value = env?.[name]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function normalizeShippingCountryCode(value: unknown): string {
  const normalized = String(value ?? '').trim().toUpperCase()
  return /^[A-Z]{2}$/.test(normalized) ? normalized : 'US'
}

function normalizePidSet(value: unknown): Set<string> {
  const out = new Set<string>()
  if (!Array.isArray(value)) return out

  for (const rawPid of value) {
    const normalizedPid = normalizeCjProductId(rawPid)
    if (normalizedPid) out.add(normalizedPid)
  }

  return out
}

type DiscoverSearchEngine = 'cj' | 'offline'
type DiscoverSearchCachedResponse = {
  expiresAt: number
  payload: Record<string, any>
}

const discoverSearchResponseCache = new Map<string, DiscoverSearchCachedResponse>()

function parseCacheTtlMs(value: string | undefined, fallbackMs: number): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return fallbackMs
  return Math.floor(numeric)
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback
  return Math.floor(numeric)
}

const DISCOVER_SINGLE_CALL_CACHE_TTL_MS = parseCacheTtlMs(
  readEnv('DISCOVER_SINGLE_CALL_CACHE_TTL_MS'),
  45_000
)
const DISCOVER_SINGLE_CALL_CACHE_MAX_ENTRIES = Math.max(
  1,
  Math.floor(parseCacheTtlMs(readEnv('DISCOVER_SINGLE_CALL_CACHE_MAX_ENTRIES'), 80))
)
const DISCOVER_SINGLE_CALL_MAX_RUNTIME_MS = Math.max(
  4_000,
  parsePositiveInt(readEnv('DISCOVER_SINGLE_CALL_MAX_RUNTIME_MS'), 26_000)
)
const DISCOVER_SINGLE_CALL_UPSTREAM_TIMEOUT_MS = Math.max(
  3_000,
  parsePositiveInt(readEnv('DISCOVER_SINGLE_CALL_UPSTREAM_TIMEOUT_MS'), 9_500)
)
const DISCOVER_SINGLE_CALL_MAX_BATCH_REQUESTS = Math.max(
  1,
  parsePositiveInt(readEnv('DISCOVER_SINGLE_CALL_MAX_BATCH_REQUESTS'), 4)
)
const DISCOVER_SINGLE_CALL_BATCH_SIZE_FLOOR = Math.max(
  1,
  parsePositiveInt(readEnv('DISCOVER_SINGLE_CALL_BATCH_SIZE_FLOOR'), 12)
)

function parseDiscoverSearchEngine(value: unknown): DiscoverSearchEngine {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
  return normalized === 'offline' ? 'offline' : 'cj'
}

function resolveDiscoverSearchEngine(): DiscoverSearchEngine {
  return parseDiscoverSearchEngine(
    readEnv('DISCOVER_SEARCH_PRIMARY_ENGINE') ||
      readEnv('DISCOVER_ENGINE') ||
      readEnv('NEXT_PUBLIC_DISCOVER_ENGINE') ||
      'cj'
  )
}

function buildSearchAndPriceUrl(req: Request, params: {
  categoryIds: string[]
  quantity: number
  minPrice: number
  maxPrice: number
  minStock: number
  profitMargin: number
  popularity: string
  minRating: string
  shippingMethod: string
  shippingCountryCode: string
  freeShippingOnly: boolean
  mediaMode: string
  discoverProfile: string
  existingProductPolicy: string
  batchSize: number
  sizes: string[]
  discoverEngine: DiscoverSearchEngine
  batchMode?: boolean
  remainingNeeded?: number
  cursor?: string
}): URL {
  const url = new URL('/api/admin/cj/products/search-and-price', new URL(req.url))
  const query = url.searchParams

  query.set('categoryIds', params.categoryIds.join(','))
  query.set('quantity', String(params.quantity))
  query.set('minPrice', String(params.minPrice))
  query.set('maxPrice', String(params.maxPrice))
  query.set('minStock', String(params.minStock))
  query.set('profitMargin', String(params.profitMargin))
  query.set('popularity', params.popularity)
  query.set('minRating', params.minRating)
  query.set('shippingMethod', params.shippingMethod)
  query.set('shippingCountry', params.shippingCountryCode)
  query.set('freeShippingOnly', params.freeShippingOnly ? '1' : '0')
  query.set('mediaMode', params.mediaMode)
  query.set('discoverProfile', params.discoverProfile)
  query.set('existingProductPolicy', params.existingProductPolicy)
  query.set('batchSize', String(params.batchSize))
  query.set('discoverEngine', params.discoverEngine)
  if (params.batchMode) query.set('batchMode', '1')
  if (Number.isFinite(params.remainingNeeded) && Number(params.remainingNeeded) >= 0) {
    query.set('remainingNeeded', String(Math.floor(Number(params.remainingNeeded))))
  }
  if (typeof params.cursor === 'string' && params.cursor.trim().length > 0) {
    query.set('cursor', params.cursor.trim())
  }

  if (params.sizes.length > 0) {
    query.set('sizes', params.sizes.join(','))
  }

  return url
}

function buildDiscoverSearchCacheKey(input: {
  categoryIds: string[]
  quantity: number
  minPrice: number
  maxPrice: number
  minStock: number
  profitMargin: number
  popularity: string
  minRating: string
  shippingMethod: string
  shippingCountryCode: string
  freeShippingOnly: boolean
  mediaMode: string
  discoverProfile: string
  existingProductPolicy: string
  batchSize: number
  sizes: string[]
  discoverEngine: DiscoverSearchEngine
  seenPids: Set<string>
  deletedPids: Set<string>
}): string {
  return JSON.stringify({
    categoryIds: [...input.categoryIds].sort(),
    quantity: input.quantity,
    minPrice: input.minPrice,
    maxPrice: input.maxPrice,
    minStock: input.minStock,
    profitMargin: input.profitMargin,
    popularity: input.popularity,
    minRating: input.minRating,
    shippingMethod: input.shippingMethod,
    shippingCountryCode: input.shippingCountryCode,
    freeShippingOnly: input.freeShippingOnly,
    mediaMode: input.mediaMode,
    discoverProfile: input.discoverProfile,
    existingProductPolicy: input.existingProductPolicy,
    batchSize: input.batchSize,
    sizes: [...input.sizes].sort(),
    discoverEngine: input.discoverEngine,
    seenPids: [...input.seenPids].sort(),
    deletedPids: [...input.deletedPids].sort(),
  })
}

function readDiscoverSearchResponseCache(key: string): Record<string, any> | null {
  const cached = discoverSearchResponseCache.get(key)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    discoverSearchResponseCache.delete(key)
    return null
  }
  return cached.payload
}

function writeDiscoverSearchResponseCache(key: string, payload: Record<string, any>): void {
  while (discoverSearchResponseCache.size >= DISCOVER_SINGLE_CALL_CACHE_MAX_ENTRIES) {
    const oldestKey = discoverSearchResponseCache.keys().next().value
    if (!oldestKey) break
    discoverSearchResponseCache.delete(oldestKey)
  }
  discoverSearchResponseCache.set(key, {
    expiresAt: Date.now() + DISCOVER_SINGLE_CALL_CACHE_TTL_MS,
    payload,
  })
}

export async function POST(req: Request) {
  const log = loggerForRequest(req)
  const startedAt = Date.now()

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

    const shippingCountryCode = normalizeShippingCountryCode(
      body?.shippingCountry ||
        body?.shippingCountryCode ||
        readEnv('DISCOVER_SHIPPING_COUNTRY') ||
        readEnv('NEXT_PUBLIC_DEFAULT_SHIPPING_COUNTRY') ||
        'US'
    )
    const discoverEngine = resolveDiscoverSearchEngine()

    const requestDeletedPids = normalizePidSet(body?.deletedPids)
    let deletedExcludedPids = new Set(requestDeletedPids)

    try {
      const mergedDeletedPids = await loadDiscoverDeletedPids({
        extraPids: Array.from(requestDeletedPids),
        includeLegacyPids: true,
      })
      deletedExcludedPids = new Set(mergedDeletedPids)
    } catch (error) {
      console.error('[DiscoverSearch] Failed to load persistent deleted PIDs:', error)
    }

    const seenPidsFromClient = normalizePidSet(body?.seenPids)
    const searchCacheKey = buildDiscoverSearchCacheKey({
      categoryIds: filters.categoryIds,
      quantity: filters.quantity,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      minStock: filters.minStock,
      profitMargin: filters.profitMargin,
      popularity: filters.popularity,
      minRating: filters.minRating,
      shippingMethod: filters.shippingMethod,
      shippingCountryCode,
      freeShippingOnly: filters.freeShippingOnly,
      mediaMode: filters.mediaMode,
      discoverProfile: filters.discoverProfile,
      existingProductPolicy: filters.existingProductPolicy,
      batchSize: filters.batchSize,
      sizes: filters.sizes,
      discoverEngine,
      seenPids: seenPidsFromClient,
      deletedPids: deletedExcludedPids,
    })

    const cachedResponse = readDiscoverSearchResponseCache(searchCacheKey)
    if (cachedResponse) {
      const r = NextResponse.json(
        {
          ...cachedResponse,
          duration: Date.now() - startedAt,
          debug: {
            ...(cachedResponse.debug && typeof cachedResponse.debug === 'object'
              ? cachedResponse.debug
              : {}),
            cache: {
              hit: true,
              ttlMs: DISCOVER_SINGLE_CALL_CACHE_TTL_MS,
            },
          },
        },
        { headers: { 'Cache-Control': 'no-store' } }
      )
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const forwardedCookie = req.headers.get('cookie') || ''
    const batchSize = Math.min(24, Math.max(filters.batchSize, DISCOVER_SINGLE_CALL_BATCH_SIZE_FLOOR))
    const seenPidsForUpstream = new Set(seenPidsFromClient)
    const products: any[] = []
    const responseProductPids = new Set<string>()
    let cursor = '0.1.0'
    let hasMore = true
    let upstreamCalls = 0
    let rawUpstreamProducts = 0
    let filteredByDeleted = 0
    let filteredByDuplicate = 0
    let stopReason:
      | 'fulfilled'
      | 'upstream_exhausted'
      | 'runtime_budget_reached'
      | 'batch_budget_reached'
      | 'upstream_timeout'
      | 'upstream_error'
      | 'invalid_batch_cursor' = 'upstream_exhausted'
    let upstreamErrorMessage: string | null = null
    let finalUpstreamStatus = 200
    let lastUpstreamData: any = null

    while (
      products.length < filters.quantity &&
      hasMore &&
      upstreamCalls < DISCOVER_SINGLE_CALL_MAX_BATCH_REQUESTS &&
      Date.now() - startedAt < DISCOVER_SINGLE_CALL_MAX_RUNTIME_MS
    ) {
      const remainingNeeded = Math.max(0, filters.quantity - products.length)
      if (remainingNeeded <= 0) {
        stopReason = 'fulfilled'
        break
      }

      const searchUrl = buildSearchAndPriceUrl(req, {
        categoryIds: filters.categoryIds,
        quantity: filters.quantity,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        minStock: filters.minStock,
        profitMargin: filters.profitMargin,
        popularity: filters.popularity,
        minRating: filters.minRating,
        shippingMethod: filters.shippingMethod,
        shippingCountryCode,
        freeShippingOnly: filters.freeShippingOnly,
        mediaMode: filters.mediaMode,
        discoverProfile: filters.discoverProfile,
        existingProductPolicy: filters.existingProductPolicy,
        batchSize,
        sizes: filters.sizes,
        discoverEngine,
        batchMode: true,
        remainingNeeded,
        cursor,
      })

      const upstreamAbortController = new AbortController()
      const upstreamTimeout = setTimeout(() => {
        upstreamAbortController.abort()
      }, DISCOVER_SINGLE_CALL_UPSTREAM_TIMEOUT_MS)

      let upstreamResponse: Response
      try {
        upstreamResponse = await fetch(searchUrl.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(forwardedCookie ? { cookie: forwardedCookie } : {}),
            'x-discover-single-call': '1',
            'x-discover-primary-engine': discoverEngine,
          },
          body: JSON.stringify({
            seenPids: Array.from(seenPidsForUpstream),
            deletedPids: Array.from(deletedExcludedPids),
          }),
          cache: 'no-store',
          signal: upstreamAbortController.signal,
        })
      } catch (error: any) {
        stopReason = String(error?.name || '').toLowerCase() === 'aborterror'
          ? 'upstream_timeout'
          : 'upstream_error'
        upstreamErrorMessage =
          stopReason === 'upstream_timeout'
            ? `Discover upstream timed out after ${DISCOVER_SINGLE_CALL_UPSTREAM_TIMEOUT_MS}ms`
            : String(error?.message || 'Discover upstream request failed')
        break
      } finally {
        clearTimeout(upstreamTimeout)
      }

      upstreamCalls += 1
      finalUpstreamStatus = upstreamResponse.status >= 400 ? upstreamResponse.status : 200

      const upstreamContentType = upstreamResponse.headers.get('content-type') || ''
      if (!upstreamContentType.includes('application/json')) {
        const text = await upstreamResponse.text()
        stopReason = 'upstream_error'
        upstreamErrorMessage = `Discover upstream returned non-JSON response (${text.slice(0, 160)})`
        break
      }

      const upstreamData: any = await upstreamResponse.json()
      lastUpstreamData = upstreamData

      if (!upstreamResponse.ok || !upstreamData?.ok) {
        stopReason = 'upstream_error'
        upstreamErrorMessage = upstreamData?.error || `Discover search failed (${finalUpstreamStatus})`
        break
      }

      const upstreamProducts = Array.isArray(upstreamData?.products) ? upstreamData.products : []
      rawUpstreamProducts += upstreamProducts.length

      for (const product of upstreamProducts) {
        const normalizedPid = normalizeCjProductId((product as any)?.pid)
        if (normalizedPid && deletedExcludedPids.has(normalizedPid)) {
          filteredByDeleted += 1
          continue
        }
        if (normalizedPid && (responseProductPids.has(normalizedPid) || seenPidsForUpstream.has(normalizedPid))) {
          filteredByDuplicate += 1
          continue
        }

        products.push(product)
        if (normalizedPid) {
          responseProductPids.add(normalizedPid)
          seenPidsForUpstream.add(normalizedPid)
        }
        if (products.length >= filters.quantity) break
      }

      const attemptedPids = Array.isArray(upstreamData?.batch?.attemptedPids)
        ? upstreamData.batch.attemptedPids
        : []
      for (const attemptedPid of attemptedPids) {
        const normalizedAttemptedPid = normalizeCjProductId(attemptedPid)
        if (normalizedAttemptedPid) seenPidsForUpstream.add(normalizedAttemptedPid)
      }

      const upstreamBatch = upstreamData?.batch
      if (!upstreamBatch || typeof upstreamBatch !== 'object') {
        hasMore = false
        continue
      }

      hasMore = Boolean(upstreamBatch.hasMore)
      const nextCursor = typeof upstreamBatch.cursor === 'string' ? upstreamBatch.cursor.trim() : ''
      if (hasMore && nextCursor.length === 0) {
        stopReason = 'invalid_batch_cursor'
        upstreamErrorMessage = 'Discover upstream did not return a cursor for a remaining batch'
        break
      }
      if (nextCursor.length > 0) {
        cursor = nextCursor
      }
    }

    if (products.length >= filters.quantity) {
      stopReason = 'fulfilled'
    } else if (
      stopReason === 'upstream_exhausted' &&
      Date.now() - startedAt >= DISCOVER_SINGLE_CALL_MAX_RUNTIME_MS
    ) {
      stopReason = 'runtime_budget_reached'
    } else if (
      stopReason === 'upstream_exhausted' &&
      hasMore &&
      upstreamCalls >= DISCOVER_SINGLE_CALL_MAX_BATCH_REQUESTS
    ) {
      stopReason = 'batch_budget_reached'
    }

    if (products.length === 0 && (stopReason === 'upstream_timeout' || stopReason === 'upstream_error')) {
      const status = stopReason === 'upstream_timeout'
        ? 504
        : finalUpstreamStatus >= 400
          ? finalUpstreamStatus
          : 502
      const r = NextResponse.json(
        {
          ok: false,
          error:
            upstreamErrorMessage ||
            (stopReason === 'upstream_timeout'
              ? `Discover upstream timed out after ${DISCOVER_SINGLE_CALL_UPSTREAM_TIMEOUT_MS}ms`
              : `Discover search failed (${status})`),
          products: [],
          count: 0,
          requestedQuantity: filters.quantity,
          quantityFulfilled: false,
          discoverEngine,
          mediaMode: filters.mediaMode,
          discoverProfile: filters.discoverProfile,
          shippingCountryCode,
          duration: Date.now() - startedAt,
          debug: {
            upstreamStatus: status,
            stopReason,
            upstreamCalls,
            budgets: {
              maxRuntimeMs: DISCOVER_SINGLE_CALL_MAX_RUNTIME_MS,
              upstreamTimeoutMs: DISCOVER_SINGLE_CALL_UPSTREAM_TIMEOUT_MS,
              maxBatchRequests: DISCOVER_SINGLE_CALL_MAX_BATCH_REQUESTS,
            },
          },
        },
        { status, headers: { 'Cache-Control': 'no-store' } }
      )
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const quantityFulfilled = products.length >= filters.quantity
    const shortfallReason = !quantityFulfilled
      ? stopReason === 'batch_budget_reached'
        ? `Search budget reached after ${upstreamCalls} internal batches. Found ${products.length}/${filters.quantity} products.`
        : stopReason === 'runtime_budget_reached'
          ? `Search runtime budget reached. Found ${products.length}/${filters.quantity} products.`
          : stopReason === 'upstream_timeout'
            ? `Search upstream timeout reached. Found ${products.length}/${filters.quantity} products so far.`
            : stopReason === 'upstream_error'
              ? upstreamErrorMessage || `Discover search failed after partial results (${products.length}/${filters.quantity}).`
              : stopReason === 'invalid_batch_cursor'
                ? `Search pagination state was invalid. Found ${products.length}/${filters.quantity} products.`
                : typeof lastUpstreamData?.shortfallReason === 'string' && lastUpstreamData.shortfallReason.trim()
                  ? lastUpstreamData.shortfallReason.trim()
                  : `Found ${products.length}/${filters.quantity} products. Not enough matching products in this category.`
      : null

    const responsePayload = {
      ok: true,
      products,
      count: products.length,
      requestedQuantity: filters.quantity,
      quantityFulfilled,
      shortfallReason,
      discoverEngine,
      mediaMode: filters.mediaMode,
      discoverProfile: filters.discoverProfile,
      shippingCountryCode,
      duration: Date.now() - startedAt,
      debug: {
        upstream: {
          requestedEngine: discoverEngine,
          resolvedEngine: lastUpstreamData?.discoverEngine || discoverEngine,
          cjApiCallbacks: Number.isFinite(Number(lastUpstreamData?.cjApiCallbacks))
            ? Number(lastUpstreamData.cjApiCallbacks)
            : undefined,
          upstreamCalls,
          stopReason,
          rawCount: rawUpstreamProducts,
          filteredDeleted,
          filteredDuplicate: filteredByDuplicate,
          deletedSetSize: deletedExcludedPids.size,
          finalCursor: cursor,
          hasMore,
          budgets: {
            maxRuntimeMs: DISCOVER_SINGLE_CALL_MAX_RUNTIME_MS,
            upstreamTimeoutMs: DISCOVER_SINGLE_CALL_UPSTREAM_TIMEOUT_MS,
            maxBatchRequests: DISCOVER_SINGLE_CALL_MAX_BATCH_REQUESTS,
          },
        },
        cache: {
          hit: false,
          ttlMs: DISCOVER_SINGLE_CALL_CACHE_TTL_MS,
        },
        ...(lastUpstreamData?.debug && typeof lastUpstreamData.debug === 'object'
          ? { searchAndPrice: lastUpstreamData.debug }
          : {}),
      },
    }
    writeDiscoverSearchResponseCache(searchCacheKey, responsePayload)

    const r = NextResponse.json(responsePayload, { headers: { 'Cache-Control': 'no-store' } })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'discover search failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
