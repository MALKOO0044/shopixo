import { NextResponse } from 'next/server'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { loadDiscoverDeletedPids } from '@/lib/discover/deleted-pids'
import { normalizeDiscoverRunFilters } from '@/lib/discover/runs'
import { normalizeCjProductId } from '@/lib/import/normalization'
import { loggerForRequest } from '@/lib/log'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

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

const DISCOVER_SINGLE_CALL_CACHE_TTL_MS = parseCacheTtlMs(
  readEnv('DISCOVER_SINGLE_CALL_CACHE_TTL_MS'),
  45_000
)
const DISCOVER_SINGLE_CALL_CACHE_MAX_ENTRIES = Math.max(
  1,
  Math.floor(parseCacheTtlMs(readEnv('DISCOVER_SINGLE_CALL_CACHE_MAX_ENTRIES'), 80))
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
      batchSize: filters.batchSize,
      sizes: filters.sizes,
      discoverEngine,
    })

    const forwardedCookie = req.headers.get('cookie') || ''
    const upstreamResponse = await fetch(searchUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(forwardedCookie ? { cookie: forwardedCookie } : {}),
        'x-discover-single-call': '1',
        'x-discover-primary-engine': discoverEngine,
      },
      body: JSON.stringify({
        seenPids: Array.from(seenPidsFromClient),
        deletedPids: Array.from(deletedExcludedPids),
      }),
      cache: 'no-store',
    })

    const upstreamContentType = upstreamResponse.headers.get('content-type') || ''
    if (!upstreamContentType.includes('application/json')) {
      const text = await upstreamResponse.text()
      const r = NextResponse.json(
        {
          ok: false,
          error: `Discover upstream returned non-JSON response (${text.slice(0, 160)})`,
        },
        { status: 502 }
      )
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const upstreamData: any = await upstreamResponse.json()
    if (!upstreamResponse.ok || !upstreamData?.ok) {
      const status = upstreamResponse.status >= 400 ? upstreamResponse.status : 500
      const r = NextResponse.json(
        {
          ok: false,
          error: upstreamData?.error || `Discover search failed (${status})`,
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
            upstreamEngine: upstreamData?.discoverEngine || null,
            upstreamStatus: status,
          },
        },
        { status, headers: { 'Cache-Control': 'no-store' } }
      )
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const upstreamProducts = Array.isArray(upstreamData?.products) ? upstreamData.products : []
    const products =
      deletedExcludedPids.size > 0
        ? upstreamProducts.filter((product: any) => {
            const pid = normalizeCjProductId(product?.pid)
            return !pid || !deletedExcludedPids.has(pid)
          })
        : upstreamProducts
    const quantityFulfilled = products.length >= filters.quantity
    const shortfallReason = !quantityFulfilled
      ? typeof upstreamData?.shortfallReason === 'string' && upstreamData.shortfallReason.trim()
        ? upstreamData.shortfallReason.trim()
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
          resolvedEngine: upstreamData?.discoverEngine || discoverEngine,
          cjApiCallbacks: Number.isFinite(Number(upstreamData?.cjApiCallbacks))
            ? Number(upstreamData.cjApiCallbacks)
            : undefined,
          rawCount: upstreamProducts.length,
          filteredDeleted: Math.max(0, upstreamProducts.length - products.length),
          deletedSetSize: deletedExcludedPids.size,
        },
        cache: {
          hit: false,
          ttlMs: DISCOVER_SINGLE_CALL_CACHE_TTL_MS,
        },
        ...(upstreamData?.debug && typeof upstreamData.debug === 'object'
          ? { searchAndPrice: upstreamData.debug }
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
