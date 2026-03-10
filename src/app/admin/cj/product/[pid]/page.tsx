"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react'
import type { PricedProduct, PricedVariant } from '@/components/admin/import/preview/types'
import PreviewPageOne from '@/components/admin/import/preview/PreviewPageOne'
import { normalizeDisplayedRating } from '@/lib/rating/engine'
import { sarToUsd } from '@/lib/pricing'
import { enhanceProductImageUrl } from '@/lib/media/image-quality'

function ImageWithFallback({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  if (error || !src) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <ImageIcon className="h-8 w-8 text-gray-300" />
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
        onLoad={() => setLoading(false)}
        onError={() => { setError(true); setLoading(false) }}
      />
    </div>
  )
}

type QueuePreviewRow = {
  cj_product_id: string
  cj_sku?: string | null
  store_sku?: string | null
  product_code?: string | null
  name_en?: string | null
  description_en?: string | null
  overview?: string | null
  product_info?: string | null
  size_info?: string | null
  product_note?: string | null
  packing_list?: string | null
  category?: string | null
  category_name?: string | null
  images?: unknown
  size_chart_images?: unknown
  variants?: unknown
  variant_pricing?: unknown
  stock_total?: number | null
  total_sales?: number | null
  calculated_retail_sar?: number | null
  profit_margin?: number | null
  displayed_rating?: number | null
  supplier_rating?: number | null
  rating_confidence?: number | null
  review_count?: number | null
  available_colors?: unknown
  available_sizes?: unknown
  available_models?: unknown
  video_url?: string | null
  video_source_url?: string | null
  video_4k_url?: string | null
  video_delivery_mode?: 'native' | 'enhanced' | 'passthrough' | null
  video_quality_gate_passed?: boolean | null
  video_source_quality_hint?: '4k' | 'hd' | 'sd' | 'unknown' | null
}

type TabType = 'overview' | 'images'

function parseArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function parseStringArray(value: unknown): string[] {
  return parseArray(value)
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function toOptionalNumber(value: unknown): number | null {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  return numeric
}

function toPositiveNumber(value: unknown): number | null {
  const numeric = toOptionalNumber(value)
  if (numeric === null || numeric <= 0) return null
  return numeric
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function mapQueueRowToPreviewProduct(row: QueuePreviewRow): PricedProduct {
  const queueImages = parseStringArray(row.images)
    .map((url) => enhanceProductImageUrl(url, 'gallery'))
    .filter((url) => /^https?:\/\//i.test(url))

  const sizeChartImages = parseStringArray(row.size_chart_images)
    .map((url) => enhanceProductImageUrl(url, 'gallery'))
    .filter((url) => /^https?:\/\//i.test(url))

  const variants = parseArray(row.variants) as PricedVariant[]
  const variantPricing = parseArray(row.variant_pricing) as Array<Record<string, unknown>>
  const variantSellPriceFromVariants = variants
    .map((variant) => toPositiveNumber(variant.sellPriceSAR))
    .filter((value): value is number => typeof value === 'number' && value > 0)

  const variantSellPriceSar = variantPricing
    .map((entry) => {
      const direct = toPositiveNumber(entry?.price)
      const altUpper = toPositiveNumber(entry?.sellPriceSAR)
      const altLower = toPositiveNumber(entry?.sellPriceSar)
      return direct ?? altUpper ?? altLower
    })
    .filter((value): value is number => typeof value === 'number' && value > 0)

  const queueRetailSar = toPositiveNumber(row.calculated_retail_sar)
  const pricedSarValues = variantSellPriceSar.length > 0
    ? variantSellPriceSar
    : variantSellPriceFromVariants.length > 0
      ? variantSellPriceFromVariants
      : queueRetailSar
        ? [queueRetailSar]
        : []

  const stockFromVariants = variants.reduce((sum, variant) => {
    const directStock = toOptionalNumber(variant.stock)
    if (directStock !== null && directStock >= 0) {
      return sum + Math.floor(directStock)
    }

    const cjStock = Math.max(0, Math.floor(toOptionalNumber(variant.cjStock) ?? 0))
    const factoryStock = Math.max(0, Math.floor(toOptionalNumber(variant.factoryStock) ?? 0))
    return sum + cjStock + factoryStock
  }, 0)

  const availableSizesRaw = parseStringArray(row.available_sizes)
  const availableColorsRaw = parseStringArray(row.available_colors)
  const availableModelsRaw = parseStringArray(row.available_models)
  const derivedSizes = dedupeStrings(variants.map((variant) => toText(variant.size)))
  const derivedColors = dedupeStrings(variants.map((variant) => toText(variant.color)))

  const availableSizes = availableSizesRaw.length > 0 ? availableSizesRaw : derivedSizes
  const availableColors = availableColorsRaw.length > 0 ? availableColorsRaw : derivedColors
  const availableModels = availableModelsRaw.length > 0 ? availableModelsRaw : []

  const queueStockTotal = Math.max(0, Math.floor(toOptionalNumber(row.stock_total) ?? 0))
  const totalStock = queueStockTotal > 0 ? queueStockTotal : stockFromVariants

  const totalSales = Math.max(0, Math.floor(toOptionalNumber(row.total_sales) ?? 0))
  const listedNum = totalSales > 0 ? totalSales : variants.length

  const totalVariants = variants.length > 0
    ? variants.length
    : Math.max(availableColors.length, availableSizes.length, 0)

  const reviewCount = Math.max(0, Math.floor(toOptionalNumber(row.review_count) ?? 0))
  const displayedRating = toPositiveNumber(row.displayed_rating) ?? toPositiveNumber(row.supplier_rating) ?? undefined
  const ratingConfidence = toPositiveNumber(row.rating_confidence) ?? undefined

  const minPriceSAR = pricedSarValues.length > 0 ? Math.min(...pricedSarValues) : 0
  const maxPriceSAR = pricedSarValues.length > 0 ? Math.max(...pricedSarValues) : minPriceSAR
  const avgPriceSAR = pricedSarValues.length > 0
    ? pricedSarValues.reduce((sum, value) => sum + value, 0) / pricedSarValues.length
    : minPriceSAR

  const profitMarginApplied = toPositiveNumber(row.profit_margin) ?? undefined

  return {
    pid: toText(row.cj_product_id),
    cjSku: toText(row.cj_sku) || toText(row.cj_product_id),
    storeSku: toText(row.store_sku) || toText(row.product_code) || undefined,
    name: toText(row.name_en) || 'Unknown Product',
    images: queueImages,
    minPriceSAR,
    maxPriceSAR,
    avgPriceSAR,
    minPriceUSD: minPriceSAR > 0 ? sarToUsd(minPriceSAR) : undefined,
    maxPriceUSD: maxPriceSAR > 0 ? sarToUsd(maxPriceSAR) : undefined,
    avgPriceUSD: avgPriceSAR > 0 ? sarToUsd(avgPriceSAR) : undefined,
    profitMarginApplied,
    stock: totalStock,
    listedNum,
    variants,
    successfulVariants: variants.length,
    totalVariants,
    description: toText(row.description_en) || undefined,
    overview: toText(row.overview) || undefined,
    productInfo: toText(row.product_info) || undefined,
    sizeInfo: toText(row.size_info) || undefined,
    productNote: toText(row.product_note) || undefined,
    packingList: toText(row.packing_list) || undefined,
    displayedRating,
    ratingConfidence,
    reviewCount,
    categoryName: toText(row.category_name) || toText(row.category) || undefined,
    sizeChartImages,
    videoUrl: toText(row.video_url) || undefined,
    videoSourceUrl: toText(row.video_source_url) || undefined,
    video4kUrl: toText(row.video_4k_url) || undefined,
    videoDeliveryMode: row.video_delivery_mode ?? undefined,
    videoQualityGatePassed: typeof row.video_quality_gate_passed === 'boolean' ? row.video_quality_gate_passed : undefined,
    videoSourceQualityHint: row.video_source_quality_hint ?? undefined,
    availableSizes,
    availableColors,
    availableModels,
  }
}

export default function CjProductAdminPage({ params }: { params: { pid: string } }) {
  const pid = decodeURIComponent(params.pid)
  const [loading, setLoading] = useState(true)
  const [product, setProduct] = useState<PricedProduct | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      setErr(null)

      try {
        const res = await fetch(`/api/admin/import/queue?pid=${encodeURIComponent(pid)}`, { cache: 'no-store' })
        const payload = await res.json().catch(() => ({}))
        if (!mounted) return

        if (!res.ok || !payload?.ok || !payload?.product) {
          setProduct(null)
          setErr(payload?.error || 'Failed to load queue product')
          return
        }

        setProduct(mapQueueRowToPreviewProduct(payload.product as QueuePreviewRow))
      } catch (e: any) {
        if (!mounted) return
        setProduct(null)
        setErr(e?.message || String(e))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [pid])

  useEffect(() => {
    setSelectedImageIndex(0)
  }, [product?.pid])

  const tabs: Array<{ id: TabType; label: string; icon: typeof Eye }> = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'images', label: 'Gallery', icon: ImageIcon },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading queue preview...</p>
          <p className="text-sm text-gray-400 mt-2">Fetching product data from your review list</p>
        </div>
      </div>
    )
  }

  if (err || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Product</h2>
          <p className="text-gray-600 mb-4">{err || 'Product not found'}</p>
          <Link href="/admin/import/queue" className="text-blue-600 hover:underline">
            Back to Review List
          </Link>
        </div>
      </div>
    )
  }

  const images = product.images || []
  const activeImageIndex = images.length > 0
    ? Math.min(selectedImageIndex, images.length - 1)
    : 0
  const totalStock = product.stock || 0
  const displayedRating = typeof product.displayedRating === 'number'
    ? normalizeDisplayedRating(product.displayedRating)
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/import/queue" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-500">CJ #{pid.slice(-8)}</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    totalStock > 100 ? 'bg-green-100 text-green-700' :
                    totalStock > 0 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {totalStock > 0 ? `${totalStock.toLocaleString()} in stock` : 'Out of stock'}
                  </span>
                  {displayedRating !== null && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                      ★ {displayedRating.toFixed(1)}
                    </span>
                  )}
                </div>
                <h1 className="text-lg font-semibold text-gray-900 line-clamp-1 max-w-xl">
                  {product.name || 'Unknown Product'}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="aspect-video relative bg-gray-100">
                {images.length > 0 ? (
                  <ImageWithFallback
                    src={images[activeImageIndex]}
                    alt={product.name || 'Product'}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-16 w-16 text-gray-300" />
                  </div>
                )}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full shadow hover:bg-white transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setSelectedImageIndex(prev => (prev + 1) % images.length)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full shadow hover:bg-white transition-colors"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
                {images.length > 0 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-white text-xs">
                    {activeImageIndex + 1} / {images.length}
                  </div>
                )}
              </div>
              {images.length > 0 && (
                <div className="p-4 border-t">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {images.slice(0, 12).map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                          activeImageIndex === idx ? 'border-blue-500' : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        <ImageWithFallback src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border shadow-sm">
              <div className="border-b">
                <div className="flex overflow-x-auto">
                  {tabs.map(tab => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                          activeTab === tab.id
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="p-6">
                {activeTab === 'overview' && (
                  <PreviewPageOne product={product} />
                )}
                {activeTab === 'images' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">Product Images ({images.length})</h3>
                    {images.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {images.map((img, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedImageIndex(idx)}
                            className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                              activeImageIndex === idx ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-400'
                            }`}
                          >
                            <ImageWithFallback src={img} alt={`Image ${idx + 1}`} className="w-full h-full" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
                        No gallery images available for this queue item.
                      </div>
                    )}
                    {product.sizeChartImages && product.sizeChartImages.length > 0 && (
                      <div className="mt-8">
                        <h4 className="text-md font-semibold text-gray-900 mb-4">Size Charts</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {product.sizeChartImages.map((img, idx) => (
                            <div key={idx} className="rounded-lg overflow-hidden border">
                              <ImageWithFallback src={img} alt={`Size chart ${idx + 1}`} className="w-full h-auto" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Product ID</span>
                  <span className="font-mono text-sm text-gray-900">{pid.slice(-12)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">SKU</span>
                  <span className="font-mono text-sm text-gray-900">{product.cjSku}</span>
                </div>
                {displayedRating !== null && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Rating</span>
                    <span className="font-semibold text-amber-600">★ {displayedRating.toFixed(1)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Total Stock</span>
                  <span className={`font-semibold ${totalStock > 100 ? 'text-green-600' : totalStock > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                    {totalStock.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Variants</span>
                  <span className="font-semibold">{product.totalVariants}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Images</span>
                  <span className="font-semibold">{images.length}</span>
                </div>
                {product.listedNum > 0 && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Times Listed</span>
                    <span className="font-semibold text-blue-600">{product.listedNum.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {product.minPriceSAR > 0 && (
              <div className="bg-white rounded-xl border shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Suggested Retail (SAR)</span>
                    <span className="font-semibold text-emerald-700">
                      {Number(product.maxPriceSAR) > Number(product.minPriceSAR)
                        ? `${Number(product.minPriceSAR).toFixed(2)} - ${Number(product.maxPriceSAR).toFixed(2)}`
                        : `${Number(product.minPriceSAR).toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Suggested Retail</span>
                    <span className="font-bold text-green-600">
                      {(() => {
                        const directMinUsd = Number((product as any).minPriceUSD)
                        const directMaxUsd = Number((product as any).maxPriceUSD)
                        const minUsd = Number.isFinite(directMinUsd) && directMinUsd > 0
                          ? directMinUsd
                          : sarToUsd(Number(product.minPriceSAR))
                        const maxUsd = Number.isFinite(directMaxUsd) && directMaxUsd > 0
                          ? directMaxUsd
                          : sarToUsd(Number(product.maxPriceSAR))
                        return `$${minUsd.toFixed(2)} - $${maxUsd.toFixed(2)}`
                      })()}
                    </span>
                  </div>
                  {Number((product as any).profitMarginApplied) > 0 && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-600">Applied Margin</span>
                      <span className="font-semibold text-emerald-700">
                        {Number((product as any).profitMarginApplied).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(product.availableColors?.length || product.availableSizes?.length || product.availableModels?.length) && (
              <div className="bg-white rounded-xl border shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Options</h3>
                <div className="space-y-4">
                  {product.availableColors && product.availableColors.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Colors ({product.availableColors.length})</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {product.availableColors.slice(0, 10).map((color, idx) => (
                          <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                            {color}
                          </span>
                        ))}
                        {product.availableColors.length > 10 && (
                          <span className="px-3 py-1 bg-gray-200 text-gray-600 text-sm rounded-full">
                            +{product.availableColors.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {product.availableSizes && product.availableSizes.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Sizes ({product.availableSizes.length})</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {product.availableSizes.slice(0, 10).map((size, idx) => (
                          <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                            {size}
                          </span>
                        ))}
                        {product.availableSizes.length > 10 && (
                          <span className="px-3 py-1 bg-blue-200 text-blue-600 text-sm rounded-full">
                            +{product.availableSizes.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {product.availableModels && product.availableModels.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Compatible Devices ({product.availableModels.length})</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {product.availableModels.slice(0, 8).map((model, idx) => (
                          <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
                            {model}
                          </span>
                        ))}
                        {product.availableModels.length > 8 && (
                          <span className="px-3 py-1 bg-purple-200 text-purple-600 text-sm rounded-full">
                            +{product.availableModels.length - 8} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {product.categoryName && (
              <div className="bg-white rounded-xl border shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Category</h3>
                <p className="text-gray-700">{product.categoryName}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
