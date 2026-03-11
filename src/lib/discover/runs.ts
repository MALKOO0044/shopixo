import type { PricedProduct } from '@/components/admin/import/preview/types'
import { normalizeCjProductId } from '@/lib/import/normalization'

export type DiscoverMediaMode = 'any' | 'withVideo' | 'imagesOnly' | 'both'

export type DiscoverProfile = 'full' | 'fast'

export type DiscoverExistingProductPolicy = 'excludeQueueAndStore' | 'excludeQueueOnly' | 'excludeNone'

export type DiscoverRunFilters = {
  categoryIds: string[]
  quantity: number
  minPrice: number
  maxPrice: number
  minStock: number
  profitMargin: number
  popularity: string
  minRating: string
  shippingMethod: string
  shippingCountry: string
  freeShippingOnly: boolean
  mediaMode: DiscoverMediaMode
  discoverProfile: DiscoverProfile
  existingProductPolicy: DiscoverExistingProductPolicy
  sizes: string[]
  batchSize: number
}

export type DiscoverRunState = {
  cursor: string
  hasMore: boolean
  batchNumber: number
  seenPids: string[]
  resultPids: string[]
  consecutiveEmptyBatches: number
  lastShortfallReason: string | null
  lastError: string | null
  quotaExhausted: boolean
}

export type DiscoverRunParams = {
  version: number
  filters: DiscoverRunFilters
  state: DiscoverRunState
}

const DISCOVER_RUN_VERSION = 1
const DEFAULT_CURSOR = '0.1.0'

function toObject(value: unknown): Record<string, any> {
  if (!value) return {}
  if (typeof value === 'object') return value as Record<string, any>
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return {}
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object') return parsed as Record<string, any>
    } catch {
      // ignore malformed JSON-like text
    }
  }
  return {}
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase()
    if (!lowered) return false
    return lowered === '1' || lowered === 'true' || lowered === 'yes' || lowered === 'on'
  }
  return false
}

function normalizeStringArray(value: unknown): string[] {
  const out = new Set<string>()

  const push = (raw: unknown) => {
    const next = String(raw ?? '').trim()
    if (!next) return
    out.add(next)
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      push(entry)
    }
  } else if (typeof value === 'string') {
    for (const entry of value.split(',')) {
      push(entry)
    }
  }

  return Array.from(out)
}

function normalizePidList(value: unknown): string[] {
  const out = new Set<string>()

  if (!Array.isArray(value)) return []
  for (const raw of value) {
    const pid = normalizeCjProductId(raw)
    if (pid) out.add(pid)
  }

  return Array.from(out)
}

function normalizeMediaMode(value: unknown): DiscoverMediaMode {
  const mode = String(value ?? '').trim()
  if (mode === 'withVideo' || mode === 'imagesOnly' || mode === 'both' || mode === 'any') {
    return mode
  }
  return 'both'
}

function normalizeDiscoverProfile(value: unknown): DiscoverProfile {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (normalized === 'fast') return 'fast'
  if (normalized === 'full') return 'full'
  return 'full'
}

function normalizeExistingProductPolicy(value: unknown): DiscoverExistingProductPolicy {
  const normalized = String(value ?? '').trim()
  if (normalized === 'excludeQueueOnly' || normalized === 'excludeNone' || normalized === 'excludeQueueAndStore') {
    return normalized
  }
  return 'excludeQueueAndStore'
}

function normalizeShippingCountryCode(value: unknown): string {
  const normalized = String(value ?? '').trim().toUpperCase()
  return /^[A-Z]{2}$/.test(normalized) ? normalized : ''
}

export function normalizeDiscoverRunFilters(value: any): DiscoverRunFilters | null {
  const source = toObject(value)
  const categoryIds = normalizeStringArray(source.categoryIds).filter((id) => id !== 'all')
  if (categoryIds.length === 0) return null

  const minPrice = Math.max(0, Number(source.minPrice ?? 0))
  const requestedMaxPrice = Math.max(0, Number(source.maxPrice ?? 1000))
  const maxPrice = Math.max(minPrice, requestedMaxPrice)

  const rawSizes = normalizeStringArray(source.sizes)

  return {
    categoryIds,
    quantity: clamp(Number(source.quantity ?? 50), 1, 5000),
    minPrice,
    maxPrice,
    minStock: Math.max(0, Number(source.minStock ?? 0)),
    profitMargin: Math.max(1, Number(source.profitMargin ?? 8)),
    popularity: String(source.popularity || 'any') || 'any',
    minRating: String(source.minRating || 'any') || 'any',
    shippingMethod: String(source.shippingMethod || 'configured-cheapest') || 'configured-cheapest',
    shippingCountry: normalizeShippingCountryCode(source.shippingCountry),
    freeShippingOnly: normalizeBoolean(source.freeShippingOnly),
    mediaMode: normalizeMediaMode(source.mediaMode),
    discoverProfile: normalizeDiscoverProfile(source.discoverProfile),
    existingProductPolicy: normalizeExistingProductPolicy(source.existingProductPolicy),
    sizes: rawSizes,
    batchSize: clamp(Number(source.batchSize ?? 3), 1, 24),
  }
}

export function createInitialDiscoverRunState(seedSeenPids?: unknown): DiscoverRunState {
  return {
    cursor: DEFAULT_CURSOR,
    hasMore: true,
    batchNumber: 0,
    seenPids: normalizePidList(seedSeenPids),
    resultPids: [],
    consecutiveEmptyBatches: 0,
    lastShortfallReason: null,
    lastError: null,
    quotaExhausted: false,
  }
}

export function createDiscoverRunParams(filters: DiscoverRunFilters, seedSeenPids?: unknown): DiscoverRunParams {
  return {
    version: DISCOVER_RUN_VERSION,
    filters,
    state: createInitialDiscoverRunState(seedSeenPids),
  }
}

export function normalizeDiscoverRunParams(raw: any): DiscoverRunParams {
  const source = toObject(raw)

  const fallbackFilters: DiscoverRunFilters = {
    categoryIds: [],
    quantity: clamp(Number(source.quantity ?? 50), 1, 5000),
    minPrice: Math.max(0, Number(source.minPrice ?? 0)),
    maxPrice: Math.max(0, Number(source.maxPrice ?? 1000)),
    minStock: Math.max(0, Number(source.minStock ?? 0)),
    profitMargin: Math.max(1, Number(source.profitMargin ?? 8)),
    popularity: String(source.popularity || 'any') || 'any',
    minRating: String(source.minRating || 'any') || 'any',
    shippingMethod: String(source.shippingMethod || 'configured-cheapest') || 'configured-cheapest',
    shippingCountry: normalizeShippingCountryCode(source.shippingCountry),
    freeShippingOnly: normalizeBoolean(source.freeShippingOnly),
    mediaMode: normalizeMediaMode(source.mediaMode),
    discoverProfile: normalizeDiscoverProfile(source.discoverProfile),
    existingProductPolicy: normalizeExistingProductPolicy(source.existingProductPolicy),
    sizes: normalizeStringArray(source.sizes),
    batchSize: clamp(Number(source.batchSize ?? 3), 1, 24),
  }

  const normalizedFilters = normalizeDiscoverRunFilters(toObject(source.filters)) || normalizeDiscoverRunFilters(source) || fallbackFilters

  const rawState = toObject(source.state)

  return {
    version: Number(source.version || DISCOVER_RUN_VERSION) || DISCOVER_RUN_VERSION,
    filters: normalizedFilters,
    state: {
      cursor: String(rawState?.cursor || DEFAULT_CURSOR),
      hasMore: rawState?.hasMore !== false,
      batchNumber: Math.max(0, Number(rawState?.batchNumber || 0)),
      seenPids: normalizePidList(rawState?.seenPids),
      resultPids: normalizePidList(rawState?.resultPids),
      consecutiveEmptyBatches: Math.max(0, Number(rawState?.consecutiveEmptyBatches || 0)),
      lastShortfallReason:
        typeof rawState?.lastShortfallReason === 'string' && rawState.lastShortfallReason.trim()
          ? rawState.lastShortfallReason.trim()
          : null,
      lastError: typeof rawState?.lastError === 'string' && rawState.lastError.trim() ? rawState.lastError.trim() : null,
      quotaExhausted: normalizeBoolean(rawState?.quotaExhausted),
    },
  }
}

export function isDiscoverRunJob(job: any): boolean {
  if (!job || typeof job !== 'object') return false
  if (job.kind === 'discover') return true
  if (job.kind !== 'finder') return false

  const params = toObject(job.params)
  const compatFlag = params.__discoverCompat
  if (compatFlag === true || compatFlag === '1' || compatFlag === 'true') return true

  // Final fallback: infer discover shape from stored params.
  const filters = toObject(params.filters)
  const state = toObject(params.state)
  return Array.isArray(filters.categoryIds) && (typeof state.cursor === 'string' || typeof state.hasMore === 'boolean')
}

export function extractDiscoverRunProducts(items: any[]): PricedProduct[] {
  const out: PricedProduct[] = []
  const seen = new Set<string>()

  for (const item of items || []) {
    if (!item || item.step !== 'discover_result') continue
    if (item.status && item.status !== 'success') continue

    const product = item.result
    const pid = normalizeCjProductId((product as any)?.pid || item.cj_product_id)
    if (!pid || seen.has(pid)) continue

    seen.add(pid)
    out.push(product as PricedProduct)
  }

  return out
}

export function buildDiscoverSearchParams(
  filters: DiscoverRunFilters,
  state: DiscoverRunState,
  remainingNeeded: number
): URLSearchParams {
  const params = new URLSearchParams({
    categoryIds: filters.categoryIds.join(','),
    quantity: String(filters.quantity),
    minPrice: String(filters.minPrice),
    maxPrice: String(filters.maxPrice),
    minStock: String(filters.minStock),
    profitMargin: String(filters.profitMargin),
    popularity: filters.popularity,
    minRating: filters.minRating,
    shippingMethod: filters.shippingMethod,
    shippingCountry: filters.shippingCountry,
    freeShippingOnly: filters.freeShippingOnly ? '1' : '0',
    mediaMode: filters.mediaMode,
    discoverProfile: filters.discoverProfile,
    existingProductPolicy: filters.existingProductPolicy,
    discoverEngine: 'offline',
    batchMode: '1',
    batchSize: String(filters.batchSize),
    cursor: state.cursor || DEFAULT_CURSOR,
    remainingNeeded: String(Math.max(0, remainingNeeded)),
  })

  if (filters.sizes.length > 0) {
    params.set('sizes', filters.sizes.join(','))
  }

  return params
}

export function buildDiscoverRunPayload(
  state: { job: any; items: any[] },
  limit?: number,
  options?: { excludedPids?: Set<string> }
) {
  const job = state.job
  const params = normalizeDiscoverRunParams(job?.params || {})
  const rawProducts = extractDiscoverRunProducts(state.items || [])
  const excludedPids = options?.excludedPids
  const products =
    excludedPids && excludedPids.size > 0
      ? rawProducts.filter((product) => {
          const normalizedPid = normalizeCjProductId((product as any)?.pid)
          return !normalizedPid || !excludedPids.has(normalizedPid)
        })
      : rawProducts

  const target = params.filters.quantity
  const found = products.length
  const hasMore = params.state.hasMore
  const terminal = job?.status === 'success' || job?.status === 'error' || job?.status === 'canceled'
  const done = terminal || found >= target || !hasMore

  const cappedLimit = Number.isFinite(Number(limit)) ? clamp(Number(limit), 1, 5000) : null
  const limitedProducts = cappedLimit ? products.slice(0, cappedLimit) : products

  let shortfallReason: string | null = null
  if (done && found < target) {
    shortfallReason =
      params.state.lastError ||
      params.state.lastShortfallReason ||
      `Found ${found}/${target} products. Not enough matching products in this category.`
  }

  return {
    run: {
      id: Number(job?.id || 0),
      status: String(job?.status || 'pending'),
      createdAt: job?.created_at || null,
      startedAt: job?.started_at || null,
      finishedAt: job?.finished_at || null,
      error: job?.error_text || params.state.lastError || null,
      filters: params.filters,
      progress: {
        found,
        target,
        remaining: Math.max(0, target - found),
        seenPids: params.state.seenPids.length,
        batches: params.state.batchNumber,
        cursor: params.state.cursor,
        hasMore,
      },
    },
    done,
    shortfallReason,
    quotaExhausted: params.state.quotaExhausted,
    products: limitedProducts,
    totalProducts: found,
  }
}
