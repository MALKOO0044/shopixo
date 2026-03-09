import { createClient } from '@supabase/supabase-js'
import type { InventoryVariant, PricedProduct, PricedVariant } from '@/components/admin/import/preview/types'
import { normalizeSizeList } from '@/lib/cj/size-normalization'
import { normalizeCjProductId } from '@/lib/import/normalization'
import { enhanceProductImageUrl } from '@/lib/media/image-quality'
import { computeRetailFromLanded, sarToUsd, usdToSar } from '@/lib/pricing'

type CatalogMediaMode = 'any' | 'withVideo' | 'imagesOnly' | 'both'
type ExistingPolicy = 'excludeQueueAndStore' | 'excludeQueueOnly' | 'excludeNone'

export type OfflineDiscoverSearchInput = {
  categoryIds: string[]
  quantity: number
  minPrice: number
  maxPrice: number
  minStock: number
  minRating: string
  popularity: string
  profitMargin: number
  shippingMethod: string
  shippingCountryCode: string
  freeShippingOnly: boolean
  mediaMode: CatalogMediaMode
  discoverProfile: 'full' | 'fast'
  existingProductPolicy: ExistingPolicy
  requestedSizes: string[]
  isBatchMode: boolean
  batchSize: number
  remainingNeeded: number
  cursorParam: string
  seenPidsFromClient: Set<string>
  deletedExcludedPids: Set<string>
}

export type OfflineDiscoverSearchResult = {
  ok: boolean
  error?: string
  products: PricedProduct[]
  hasMore: boolean
  nextCursor: string
  attemptedPids: string[]
  processedPids: string[]
  totalCandidates: number
  shortfallReason?: string
  debug: {
    scannedRows: number
    rowsAfterDeletedAndSeenFilter: number
    filteredByExisting: number
    filteredByMedia: number
    filteredBySize: number
    filteredByRating: number
    filteredByStock: number
    filteredByShipping: number
    filteredByPrice: number
    queueExcluded: number
    storeExcluded: number
  }
}

type CatalogProductRow = Record<string, any>
type CatalogVariantRow = Record<string, any>

type ExistingPidSources = {
  queue: Set<string>
  store: Set<string>
}

type ExistingPidLookupCache = {
  checked: Set<string>
  queue: Set<string>
  store: Set<string>
}

const OFFLINE_PRODUCT_BASE_SELECT = [
  'pid',
  'discover_rank',
  'images',
  'video_url',
  'video_4k_url',
  'available_sizes',
  'displayed_rating',
  'supplier_rating',
].join(',')

const OFFLINE_PRODUCT_FULL_SELECT = [
  'pid',
  'cj_sku',
  'category_id',
  'category_name',
  'name',
  'description',
  'overview',
  'product_info',
  'size_info',
  'product_note',
  'packing_list',
  'images',
  'video_url',
  'video_source_url',
  'video_4k_url',
  'video_delivery_mode',
  'video_quality_gate_passed',
  'video_source_quality_hint',
  'available_sizes',
  'available_colors',
  'available_models',
  'color_image_map',
  'supplier_rating',
  'review_count',
  'displayed_rating',
  'rating_confidence',
  'listed_num',
  'stock_total',
  'processing_days',
  'delivery_days_min',
  'delivery_days_max',
  'min_price_usd',
  'max_price_usd',
  'avg_price_usd',
  'min_price_sar',
  'max_price_sar',
  'avg_price_sar',
  'product_weight_g',
  'pack_length',
  'pack_width',
  'pack_height',
  'material',
  'product_type',
  'origin_country',
  'hs_code',
].join(',')

const OFFLINE_VARIANT_SELECT = [
  'pid',
  'variant_id',
  'variant_sku',
  'variant_name',
  'variant_image',
  'size',
  'color',
  'stock_total',
  'cj_stock',
  'factory_stock',
  'variant_price_usd',
  'shipping_price_usd',
  'shipping_price_sar',
  'total_cost_usd',
  'total_cost_sar',
  'sell_price_usd',
  'sell_price_sar',
  'profit_usd',
  'profit_sar',
  'margin_percent',
  'delivery_days',
  'logistic_name',
  'shipping_country_code',
  'shipping_method',
].join(',')

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry ?? '').trim()).filter(Boolean)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed.map((entry) => String(entry ?? '').trim()).filter(Boolean)
        }
      } catch {
        // ignore malformed JSON text
      }
    }

    return trimmed.split(',').map((entry) => entry.trim()).filter(Boolean)
  }

  return []
}

function toStringRecord(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object') return undefined

  const out: Record<string, string> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const cleanKey = String(key || '').trim()
    const cleanValue = String(raw ?? '').trim()
    if (!cleanKey || !cleanValue) continue
    out[cleanKey] = cleanValue
  }

  return Object.keys(out).length > 0 ? out : undefined
}

function parseCursorOffset(cursorParam: string): number {
  const normalized = String(cursorParam || '').trim()
  if (normalized.startsWith('offline.')) {
    const parsed = Number(normalized.slice('offline.'.length))
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0
  }

  return 0
}

function shouldIncludeByMediaMode(mode: CatalogMediaMode, hasImages: boolean, hasVideo: boolean): boolean {
  if (mode === 'withVideo') return hasVideo
  if (mode === 'imagesOnly') return hasImages && !hasVideo
  if (mode === 'both') return hasImages && hasVideo
  return hasImages || hasVideo
}

function intersects(values: string[], required: string[]): boolean {
  if (required.length === 0) return true
  if (values.length === 0) return true
  const source = new Set(values.map((entry) => entry.toLowerCase()))
  return required.some((entry) => source.has(entry.toLowerCase()))
}

async function resolveExistingPidSources(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  candidatePids: string[],
  cache?: ExistingPidLookupCache,
): Promise<ExistingPidSources> {
  const queue = new Set<string>()
  const store = new Set<string>()

  if (!supabaseAdmin || candidatePids.length === 0) return { queue, store }

  const deduped = Array.from(new Set(candidatePids.map((pid) => normalizeCjProductId(pid)).filter(Boolean) as string[]))
  if (deduped.length === 0) return { queue, store }

  const checkedSet = cache?.checked || new Set<string>()
  const cachedQueueSet = cache?.queue || new Set<string>()
  const cachedStoreSet = cache?.store || new Set<string>()

  const unknown = deduped.filter((pid) => !checkedSet.has(pid))

  const chunkSize = 200
  for (let i = 0; i < unknown.length; i += chunkSize) {
    const chunk = unknown.slice(i, i + chunkSize)

    const [queueRes, storeRes] = await Promise.all([
      supabaseAdmin.from('product_queue').select('cj_product_id').in('cj_product_id', chunk),
      supabaseAdmin.from('products').select('cj_product_id').in('cj_product_id', chunk),
    ])

    const queueLookupSucceeded = !queueRes.error
    const storeLookupSucceeded = !storeRes.error

    if (queueLookupSucceeded) {
      for (const row of queueRes.data || []) {
        const pid = normalizeCjProductId((row as any)?.cj_product_id)
        if (pid) cachedQueueSet.add(pid)
      }
    }

    if (storeLookupSucceeded) {
      for (const row of storeRes.data || []) {
        const pid = normalizeCjProductId((row as any)?.cj_product_id)
        if (pid) cachedStoreSet.add(pid)
      }
    }

    if (queueLookupSucceeded && storeLookupSucceeded) {
      for (const pid of chunk) {
        checkedSet.add(pid)
      }
    }
  }

  for (const pid of deduped) {
    if (cachedQueueSet.has(pid)) queue.add(pid)
    if (cachedStoreSet.has(pid)) store.add(pid)
  }

  return { queue, store }
}

function passesOfflineProductPreFilters(
  row: CatalogProductRow,
  input: OfflineDiscoverSearchInput,
  requestedSizes: string[],
  debug: OfflineDiscoverSearchResult['debug']
): boolean {
  const hasImages = toStringArray(row.images).some((value) => /^https?:\/\//i.test(String(value || '').trim()))
  const hasVideo = Boolean(String(row.video_4k_url || '').trim() || String(row.video_url || '').trim())

  if (!shouldIncludeByMediaMode(input.mediaMode, hasImages, hasVideo)) {
    debug.filteredByMedia++
    return false
  }

  const availableSizes = normalizeSizeList(toStringArray(row.available_sizes), { allowNumeric: false })
  if (!intersects(availableSizes, requestedSizes)) {
    debug.filteredBySize++
    return false
  }

  const minRatingNum = input.minRating === 'any' ? 0 : toFiniteNumber(input.minRating, 0)
  const displayedRating = toFiniteNumber(row.displayed_rating, toFiniteNumber(row.supplier_rating, 0))
  if (minRatingNum > 0 && displayedRating > 0 && displayedRating < minRatingNum) {
    debug.filteredByRating++
    return false
  }

  return true
}

function buildOfflineVariant(
  row: CatalogVariantRow,
  input: OfflineDiscoverSearchInput,
  sizeFilter: Set<string>
): PricedVariant | null {
  const variantId = String(row.variant_id || row.vid || row.id || '').trim()
  const variantSku = String(row.variant_sku || row.sku || variantId || '').trim()
  const variantPriceUSD = toFiniteNumber(row.variant_price_usd, 0)
  if (!variantSku || variantPriceUSD <= 0) return null

  const rawShippingUSD = toFiniteNumber(row.shipping_price_usd, 0)
  if (input.freeShippingOnly && rawShippingUSD > 0.0001) return null

  const shippingPriceUSD = Math.max(0, rawShippingUSD)
  const shippingPriceSAR = toFiniteNumber(row.shipping_price_sar, usdToSar(shippingPriceUSD))

  const totalCostUSD = toFiniteNumber(row.total_cost_usd, Number((variantPriceUSD + shippingPriceUSD).toFixed(2)))
  const totalCostSAR = toFiniteNumber(row.total_cost_sar, usdToSar(totalCostUSD))

  const sellPriceSAR = toFiniteNumber(
    row.sell_price_sar,
    computeRetailFromLanded(totalCostSAR, { margin: input.profitMargin / 100 })
  )

  const sellPriceUSD = toFiniteNumber(row.sell_price_usd, sarToUsd(sellPriceSAR))
  const profitSAR = toFiniteNumber(row.profit_sar, sellPriceSAR - totalCostSAR)
  const profitUSD = toFiniteNumber(row.profit_usd, sellPriceUSD - totalCostUSD)
  const marginPercent = toFiniteNumber(
    row.margin_percent,
    sellPriceUSD > 0 ? Number(((profitUSD / sellPriceUSD) * 100).toFixed(2)) : 0
  )

  const size = String(row.size || '').trim() || undefined
  const color = String(row.color || '').trim() || undefined
  if (sizeFilter.size > 0 && size && !sizeFilter.has(size.toLowerCase())) {
    return null
  }

  const stock = Math.max(
    0,
    toFiniteNumber(
      row.stock_total,
      toFiniteNumber(row.cj_stock, 0) + toFiniteNumber(row.factory_stock, 0)
    )
  )

  return {
    variantId: variantId || variantSku,
    variantSku,
    variantPriceUSD,
    shippingAvailable: true,
    shippingPriceUSD,
    shippingPriceSAR,
    deliveryDays: String(row.delivery_days || 'N/A (offline)').trim(),
    logisticName: String(row.logistic_name || row.shipping_method || 'offline-catalog').trim(),
    sellPriceSAR,
    sellPriceUSD,
    totalCostSAR,
    totalCostUSD,
    profitSAR,
    profitUSD,
    marginPercent,
    variantName: String(row.variant_name || '').trim() || undefined,
    variantImage: String(row.variant_image || '').trim() || undefined,
    size,
    color,
    stock,
    cjStock: Math.max(0, toFiniteNumber(row.cj_stock, 0)),
    factoryStock: Math.max(0, toFiniteNumber(row.factory_stock, 0)),
  }
}

function buildOfflineProduct(
  row: CatalogProductRow,
  variantRows: CatalogVariantRow[],
  input: OfflineDiscoverSearchInput,
  debug: OfflineDiscoverSearchResult['debug']
): PricedProduct | null {
  const pid = normalizeCjProductId(row.pid)
  if (!pid) return null

  const images = toStringArray(row.images)
    .map((url) => enhanceProductImageUrl(String(url || '').trim(), 'gallery'))
    .filter((url) => /^https?:\/\//i.test(url))

  const videoUrl = String(row.video_url || '').trim() || undefined
  const videoSourceUrl = String(row.video_source_url || '').trim() || undefined
  const video4kUrl = String(row.video_4k_url || '').trim() || undefined
  const hasVideo = Boolean(video4kUrl || videoUrl)
  const hasImages = images.length > 0

  if (!shouldIncludeByMediaMode(input.mediaMode, hasImages, hasVideo)) {
    debug.filteredByMedia++
    return null
  }

  const availableSizes = normalizeSizeList(toStringArray(row.available_sizes), { allowNumeric: false })
  const requestedSizes = normalizeSizeList(input.requestedSizes, { allowNumeric: false })
  if (!intersects(availableSizes, requestedSizes)) {
    debug.filteredBySize++
    return null
  }

  const minRatingNum = input.minRating === 'any' ? 0 : toFiniteNumber(input.minRating, 0)
  const displayedRating = toFiniteNumber(row.displayed_rating, toFiniteNumber(row.supplier_rating, 0))
  if (minRatingNum > 0 && displayedRating > 0 && displayedRating < minRatingNum) {
    debug.filteredByRating++
    return null
  }

  const sizeFilter = new Set(requestedSizes.map((entry) => entry.toLowerCase()))
  const pricedVariants = variantRows
    .map((variantRow) => buildOfflineVariant(variantRow, input, sizeFilter))
    .filter((entry): entry is PricedVariant => Boolean(entry))

  if (pricedVariants.length === 0) {
    const fallbackVariantPriceUSD = Math.max(
      0,
      toFiniteNumber(row.avg_price_usd, toFiniteNumber(row.min_price_usd, 0))
    )

    if (fallbackVariantPriceUSD > 0) {
      const fallbackVariant = buildOfflineVariant(
        {
          variant_id: `${pid}-default`,
          variant_sku: String(row.cj_sku || `${pid}-default`),
          variant_name: 'Default',
          variant_price_usd: fallbackVariantPriceUSD,
          shipping_price_usd: 0,
          shipping_price_sar: 0,
          stock_total: toFiniteNumber(row.stock_total, 0),
          logistic_name: 'offline-catalog',
          delivery_days: 'N/A (offline)',
        },
        input,
        sizeFilter
      )

      if (fallbackVariant) {
        pricedVariants.push(fallbackVariant)
      }
    }
  }

  if (pricedVariants.length === 0) {
    debug.filteredByShipping++
    return null
  }

  const minVariantPriceUSD = Math.min(...pricedVariants.map((variant) => variant.variantPriceUSD))
  const maxVariantPriceUSD = Math.max(...pricedVariants.map((variant) => variant.variantPriceUSD))
  const avgVariantPriceUSD = pricedVariants.reduce((sum, variant) => sum + variant.variantPriceUSD, 0) / pricedVariants.length

  if (minVariantPriceUSD > input.maxPrice || maxVariantPriceUSD < input.minPrice) {
    debug.filteredByPrice++
    return null
  }

  const totalStock = Math.max(
    0,
    pricedVariants.reduce((sum, variant) => sum + Math.max(0, Number(variant.stock || 0)), 0)
  )

  if (totalStock < input.minStock) {
    debug.filteredByStock++
    return null
  }

  const minPriceSAR = Math.min(...pricedVariants.map((variant) => variant.sellPriceSAR))
  const maxPriceSAR = Math.max(...pricedVariants.map((variant) => variant.sellPriceSAR))
  const avgPriceSAR = pricedVariants.reduce((sum, variant) => sum + variant.sellPriceSAR, 0) / pricedVariants.length

  const inventoryVariants: InventoryVariant[] = pricedVariants.map((variant) => ({
    variantId: variant.variantId,
    sku: variant.variantSku,
    shortName: variant.variantName || variant.variantSku,
    priceUSD: variant.variantPriceUSD,
    cjStock: Number(variant.cjStock || 0),
    factoryStock: Number(variant.factoryStock || 0),
    totalStock: Number(variant.stock || 0),
  }))

  const pricedProduct: PricedProduct & Record<string, unknown> = {
    pid,
    cjSku: String(row.cj_sku || '').trim() || pid,
    name: String(row.name || row.product_name || '').trim() || `Product ${pid}`,
    images,
    variants: pricedVariants,
    inventoryVariants,
    successfulVariants: pricedVariants.length,
    totalVariants: pricedVariants.length,
    minPriceSAR,
    maxPriceSAR,
    avgPriceSAR,
    minPriceUSD: minVariantPriceUSD,
    maxPriceUSD: maxVariantPriceUSD,
    avgPriceUSD: Number(avgVariantPriceUSD.toFixed(2)),
    profitMarginApplied: input.profitMargin,
    stock: totalStock,
    listedNum: Math.max(0, Math.floor(toFiniteNumber(row.listed_num, pricedVariants.length))),
    inventoryStatus: 'partial',
    inventoryErrorMessage: 'Offline catalog mode: live inventory API disabled.',
    description: String(row.description || '').trim() || undefined,
    overview: String(row.overview || '').trim() || undefined,
    productInfo: String(row.product_info || '').trim() || undefined,
    sizeInfo: String(row.size_info || '').trim() || undefined,
    productNote: String(row.product_note || '').trim() || undefined,
    packingList: String(row.packing_list || '').trim() || undefined,
    displayedRating: displayedRating > 0 ? displayedRating : undefined,
    rating: displayedRating > 0 ? displayedRating : undefined,
    reviewCount: Math.max(0, Math.floor(toFiniteNumber(row.review_count, 0))),
    supplierRating: toFiniteNumber(row.supplier_rating, 0) || undefined,
    ratingConfidence: toFiniteNumber(row.rating_confidence, 0) || undefined,
    categoryName: String(row.category_name || '').trim() || undefined,
    productWeight: toFiniteNumber(row.product_weight_g, 0) || undefined,
    packLength: toFiniteNumber(row.pack_length, 0) || undefined,
    packWidth: toFiniteNumber(row.pack_width, 0) || undefined,
    packHeight: toFiniteNumber(row.pack_height, 0) || undefined,
    material: String(row.material || '').trim() || undefined,
    productType: String(row.product_type || '').trim() || undefined,
    originCountry: String(row.origin_country || '').trim() || undefined,
    hsCode: String(row.hs_code || '').trim() || undefined,
    videoUrl,
    videoSourceUrl,
    video4kUrl,
    videoDeliveryMode: String(row.video_delivery_mode || '').trim() as any,
    videoQualityGatePassed: Boolean(row.video_quality_gate_passed),
    videoSourceQualityHint: String(row.video_source_quality_hint || 'unknown').trim() as any,
    availableSizes,
    availableColors: toStringArray(row.available_colors),
    availableModels: toStringArray(row.available_models),
    colorImageMap: toStringRecord(row.color_image_map),
  }

  pricedProduct.processingDays = toFiniteNumber(row.processing_days, 0) || undefined
  pricedProduct.deliveryDaysMin = toFiniteNumber(row.delivery_days_min, 0) || undefined
  pricedProduct.deliveryDaysMax = toFiniteNumber(row.delivery_days_max, 0) || undefined

  pricedProduct.variantPricing = pricedVariants.map((variant) => ({
    variantId: variant.variantId,
    variantSku: variant.variantSku,
    costPrice: variant.variantPriceUSD,
    shippingPrice: variant.shippingPriceUSD,
    totalCost: variant.totalCostUSD,
    sellPriceSAR: variant.sellPriceSAR,
    sellPriceUSD: variant.sellPriceUSD,
    profitUSD: variant.profitUSD,
    marginPercent: variant.marginPercent,
  }))

  pricedProduct.discoverSource = 'offline-catalog'

  return pricedProduct as PricedProduct
}

export async function runOfflineDiscoverSearch(
  input: OfflineDiscoverSearchInput
): Promise<OfflineDiscoverSearchResult> {
  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) {
    return {
      ok: false,
      error: 'Offline discover catalog is not configured (missing Supabase admin env).',
      products: [],
      hasMore: false,
      nextCursor: 'offline.0',
      attemptedPids: [],
      processedPids: [],
      totalCandidates: 0,
      debug: {
        scannedRows: 0,
        rowsAfterDeletedAndSeenFilter: 0,
        filteredByExisting: 0,
        filteredByMedia: 0,
        filteredBySize: 0,
        filteredByRating: 0,
        filteredByStock: 0,
        filteredByShipping: 0,
        filteredByPrice: 0,
        queueExcluded: 0,
        storeExcluded: 0,
      },
    }
  }

  const maxOutput = input.isBatchMode
    ? Math.max(0, Math.min(input.batchSize, input.remainingNeeded))
    : Math.max(1, Math.min(5000, input.quantity))

  if (maxOutput <= 0) {
    return {
      ok: true,
      products: [],
      hasMore: false,
      nextCursor: input.cursorParam || 'offline.0',
      attemptedPids: [],
      processedPids: [],
      totalCandidates: 0,
      debug: {
        scannedRows: 0,
        rowsAfterDeletedAndSeenFilter: 0,
        filteredByExisting: 0,
        filteredByMedia: 0,
        filteredBySize: 0,
        filteredByRating: 0,
        filteredByStock: 0,
        filteredByShipping: 0,
        filteredByPrice: 0,
        queueExcluded: 0,
        storeExcluded: 0,
      },
    }
  }

  const debug: OfflineDiscoverSearchResult['debug'] = {
    scannedRows: 0,
    rowsAfterDeletedAndSeenFilter: 0,
    filteredByExisting: 0,
    filteredByMedia: 0,
    filteredBySize: 0,
    filteredByRating: 0,
    filteredByStock: 0,
    filteredByShipping: 0,
    filteredByPrice: 0,
    queueExcluded: 0,
    storeExcluded: 0,
  }

  const attemptedPids: string[] = []
  const processedPids: string[] = []
  const acceptedProducts: PricedProduct[] = []
  const requestedSizes = normalizeSizeList(input.requestedSizes, { allowNumeric: false })

  const existingLookupCache: ExistingPidLookupCache = {
    checked: new Set<string>(),
    queue: new Set<string>(),
    store: new Set<string>(),
  }

  const excludeQueueExisting =
    input.existingProductPolicy === 'excludeQueueAndStore' ||
    input.existingProductPolicy === 'excludeQueueOnly'

  const excludeStoreExisting = input.existingProductPolicy === 'excludeQueueAndStore'

  const categoryIds = input.categoryIds
    .map((entry) => String(entry || '').trim())
    .filter((entry) => entry && entry !== 'all')

  const windowSize = Math.min(2500, Math.max(maxOutput * 12, input.batchSize * 20, 240))

  let cursorOffset = parseCursorOffset(input.cursorParam)
  let hasMoreFromSource = true
  let loops = 0

  while (acceptedProducts.length < maxOutput && hasMoreFromSource && loops < 20) {
    loops++

    let query = supabaseAdmin
      .from('discover_catalog_products')
      .select(OFFLINE_PRODUCT_BASE_SELECT)
      .order('discover_rank', { ascending: false, nullsFirst: false })
      .order('pid', { ascending: true })
      .range(cursorOffset, cursorOffset + windowSize - 1)

    if (categoryIds.length > 0) {
      query = query.in('category_id', categoryIds)
    }

    if (Number.isFinite(input.minPrice) && input.minPrice > 0) {
      query = query.gte('min_price_usd', input.minPrice)
    }

    if (Number.isFinite(input.maxPrice) && input.maxPrice > 0) {
      query = query.lte('max_price_usd', input.maxPrice)
    }

    if (Number.isFinite(input.minStock) && input.minStock > 0) {
      query = query.gte('stock_total', input.minStock)
    }

    const minRatingNum = input.minRating === 'any' ? 0 : toFiniteNumber(input.minRating, 0)
    if (minRatingNum > 0) {
      query = query.gte('displayed_rating', minRatingNum)
    }

    const { data: sourceRows, error: sourceError } = await query
    if (sourceError) {
      return {
        ok: false,
        error: `Offline catalog query failed: ${sourceError.message}`,
        products: [],
        hasMore: false,
        nextCursor: `offline.${cursorOffset}`,
        attemptedPids,
        processedPids,
        totalCandidates: debug.scannedRows,
        debug,
      }
    }

    const rows: CatalogProductRow[] = Array.isArray(sourceRows)
      ? (sourceRows as unknown as CatalogProductRow[])
      : []
    if (rows.length === 0) {
      hasMoreFromSource = false
      break
    }

    debug.scannedRows += rows.length
    cursorOffset += rows.length
    hasMoreFromSource = rows.length >= windowSize

    const rowsAfterSeenAndDeleted: CatalogProductRow[] = []
    for (const row of rows) {
      const pid = normalizeCjProductId(row.pid)
      if (!pid) continue

      attemptedPids.push(pid)

      if (input.deletedExcludedPids.has(pid) || input.seenPidsFromClient.has(pid)) {
        debug.filteredByExisting++
        continue
      }

      rowsAfterSeenAndDeleted.push({ ...row, pid })
    }

    debug.rowsAfterDeletedAndSeenFilter += rowsAfterSeenAndDeleted.length
    if (rowsAfterSeenAndDeleted.length === 0) {
      continue
    }

    const candidatePids = rowsAfterSeenAndDeleted
      .map((row) => normalizeCjProductId(row.pid))
      .filter(Boolean) as string[]

    const existingSources =
      excludeQueueExisting || excludeStoreExisting
        ? await resolveExistingPidSources(supabaseAdmin, candidatePids, existingLookupCache)
        : { queue: new Set<string>(), store: new Set<string>() }

    debug.queueExcluded += existingSources.queue.size
    debug.storeExcluded += existingSources.store.size

    const rowsAfterExistingFilter = rowsAfterSeenAndDeleted.filter((row) => {
      const pid = normalizeCjProductId(row.pid)
      if (!pid) return false

      const blockedByQueue = excludeQueueExisting && existingSources.queue.has(pid)
      const blockedByStore = excludeStoreExisting && existingSources.store.has(pid)
      if (blockedByQueue || blockedByStore) {
        debug.filteredByExisting++
        return false
      }

      return true
    })

    if (rowsAfterExistingFilter.length === 0) {
      continue
    }

    const preFilteredRows = rowsAfterExistingFilter.filter((row) =>
      passesOfflineProductPreFilters(row, input, requestedSizes, debug)
    )

    if (preFilteredRows.length === 0) {
      continue
    }

    const remainingSlots = maxOutput - acceptedProducts.length
    const fetchPidWindow = Array.from(new Set(preFilteredRows
      .slice(0, Math.max(remainingSlots * 6, remainingSlots))
      .map((row) => normalizeCjProductId(row.pid))
      .filter(Boolean) as string[]))

    const fetchPidWindowSet = new Set(fetchPidWindow)

    let fullProductRowsByPid = new Map<string, CatalogProductRow>()
    let variantRows: CatalogVariantRow[] = []
    if (fetchPidWindow.length > 0) {
      const fullProductsQuery = supabaseAdmin
        .from('discover_catalog_products')
        .select(OFFLINE_PRODUCT_FULL_SELECT)
        .in('pid', fetchPidWindow)

      let variantQuery = supabaseAdmin
        .from('discover_catalog_variants')
        .select(OFFLINE_VARIANT_SELECT)
        .in('pid', fetchPidWindow)

      if (input.shippingCountryCode) {
        variantQuery = variantQuery.eq('shipping_country_code', input.shippingCountryCode)
      }

      if (input.shippingMethod !== 'any' && input.shippingMethod !== 'configured-cheapest') {
        variantQuery = variantQuery.eq('shipping_method', input.shippingMethod)
      }

      const [fullProductsRes, variantRes] = await Promise.all([
        fullProductsQuery,
        variantQuery,
      ])

      if (fullProductsRes.error) {
        return {
          ok: false,
          error: `Offline catalog product details query failed: ${fullProductsRes.error.message}`,
          products: [],
          hasMore: false,
          nextCursor: `offline.${cursorOffset}`,
          attemptedPids,
          processedPids,
          totalCandidates: debug.scannedRows,
          debug,
        }
      }

      for (const row of fullProductsRes.data || []) {
        const pid = normalizeCjProductId((row as any)?.pid)
        if (!pid) continue
        fullProductRowsByPid.set(pid, { ...(row as CatalogProductRow), pid })
      }

      if (variantRes.error) {
        return {
          ok: false,
          error: `Offline catalog variants query failed: ${variantRes.error.message}`,
          products: [],
          hasMore: false,
          nextCursor: `offline.${cursorOffset}`,
          attemptedPids,
          processedPids,
          totalCandidates: debug.scannedRows,
          debug,
        }
      }

      variantRows = Array.isArray(variantRes.data) ? (variantRes.data as CatalogVariantRow[]) : []

      if (variantRows.length === 0 && input.shippingCountryCode && input.shippingCountryCode !== 'US') {
        const fallbackVariantRes = await supabaseAdmin
          .from('discover_catalog_variants')
          .select(OFFLINE_VARIANT_SELECT)
          .in('pid', fetchPidWindow)
          .eq('shipping_country_code', 'US')

        if (!fallbackVariantRes.error && Array.isArray(fallbackVariantRes.data)) {
          variantRows = fallbackVariantRes.data as CatalogVariantRow[]
        }
      }
    }

    const variantsByPid = new Map<string, CatalogVariantRow[]>()
    for (const variantRow of variantRows) {
      const pid = normalizeCjProductId(variantRow.pid)
      if (!pid) continue
      const existing = variantsByPid.get(pid)
      if (existing) {
        existing.push(variantRow)
      } else {
        variantsByPid.set(pid, [variantRow])
      }
    }

    for (const row of preFilteredRows) {
      if (acceptedProducts.length >= maxOutput) break

      const pid = normalizeCjProductId(row.pid)
      if (!pid) continue
      if (!fetchPidWindowSet.has(pid)) continue

      const fullRow = fullProductRowsByPid.get(pid)
      if (!fullRow) continue

      const variants = variantsByPid.get(pid) || []
      const product = buildOfflineProduct(fullRow, variants, input, debug)
      if (!product) continue

      acceptedProducts.push(product)
      processedPids.push(pid)
    }
  }

  const hasMore = hasMoreFromSource || acceptedProducts.length >= maxOutput
  const quantityTargetForRequest = input.isBatchMode ? maxOutput : input.quantity

  const shortfallReason =
    acceptedProducts.length < quantityTargetForRequest
      ? debug.scannedRows === 0
        ? 'Offline catalog is empty. Import catalog snapshot data before discover.'
        : `Offline catalog exhausted. Got ${acceptedProducts.length}/${quantityTargetForRequest} products.`
      : undefined

  return {
    ok: true,
    products: acceptedProducts,
    hasMore,
    nextCursor: `offline.${cursorOffset}`,
    attemptedPids: Array.from(new Set(attemptedPids)),
    processedPids: Array.from(new Set(processedPids)),
    totalCandidates: debug.scannedRows,
    shortfallReason,
    debug,
  }
}
