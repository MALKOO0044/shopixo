import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { normalizeSizeList } from '@/lib/cj/size-normalization'
import { normalizeCjProductId } from '@/lib/import/normalization'
import { computeRetailFromLanded, sarToUsd, usdToSar } from '@/lib/pricing'

type InputProduct = Record<string, any>
type InputVariant = Record<string, any>

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
        // ignore malformed JSON
      }
    }

    return trimmed.split(',').map((entry) => entry.trim()).filter(Boolean)
  }

  return []
}

function normalizeCountryCode(value: unknown): string {
  const normalized = String(value ?? '').trim().toUpperCase()
  return /^[A-Z]{2}$/.test(normalized) ? normalized : 'US'
}

function toSafeText(value: unknown, fallback = ''): string {
  const text = String(value ?? '').trim()
  return text || fallback
}

function toNullableText(value: unknown): string | null {
  const text = String(value ?? '').trim()
  return text || null
}

function chunkArray<T>(values: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < values.length; i += chunkSize) {
    chunks.push(values.slice(i, i + chunkSize))
  }
  return chunks
}

function computeDiscoverRank(product: InputProduct, variants: InputVariant[]): number {
  const rating = toFiniteNumber(product.displayedRating ?? product.supplierRating, 0)
  const listed = Math.max(0, toFiniteNumber(product.listedNum ?? product.totalSales, 0))
  const stock = Math.max(0, toFiniteNumber(product.stock ?? product.totalStock, 0))
  const variantCount = variants.length
  return Number((rating * 1000 + listed * 0.2 + stock * 0.02 + variantCount * 2).toFixed(4))
}

function buildVariantRows(
  pid: string,
  product: InputProduct,
  variants: InputVariant[],
  snapshotVersion: string,
  shippingCountryCode: string,
  shippingMethod: string,
  profitMargin: number
): Record<string, any>[] {
  const rows: Record<string, any>[] = []

  for (const variant of variants) {
    const variantId = toSafeText(variant.variantId ?? variant.vid ?? variant.id, '')
    const variantSku = toSafeText(variant.variantSku ?? variant.sku ?? variantId, '')
    if (!variantSku) continue

    const variantPriceUSD = toFiniteNumber(
      variant.variantPriceUSD ?? variant.variantSellPrice ?? variant.price,
      toFiniteNumber(product.avgPriceUSD ?? product.minPriceUSD, 0)
    )

    if (variantPriceUSD <= 0) continue

    const shippingPriceUSD = Math.max(
      0,
      toFiniteNumber(variant.shippingPriceUSD ?? variant.shippingCostUSD, toFiniteNumber(product.cjShippingCost, 0))
    )

    const totalCostUSD = toFiniteNumber(
      variant.totalCostUSD,
      Number((variantPriceUSD + shippingPriceUSD).toFixed(4))
    )

    const totalCostSAR = toFiniteNumber(variant.totalCostSAR, usdToSar(totalCostUSD))

    const sellPriceSAR = toFiniteNumber(
      variant.sellPriceSAR,
      computeRetailFromLanded(totalCostSAR, { margin: profitMargin / 100 })
    )

    const sellPriceUSD = toFiniteNumber(variant.sellPriceUSD, sarToUsd(sellPriceSAR))
    const profitUSD = toFiniteNumber(variant.profitUSD, sellPriceUSD - totalCostUSD)
    const profitSAR = toFiniteNumber(variant.profitSAR, sellPriceSAR - totalCostSAR)

    const marginPercent = toFiniteNumber(
      variant.marginPercent,
      sellPriceUSD > 0 ? Number(((profitUSD / sellPriceUSD) * 100).toFixed(4)) : 0
    )

    rows.push({
      pid,
      variant_id: variantId || variantSku,
      variant_sku: variantSku,
      variant_name: toNullableText(variant.variantName),
      variant_image: toNullableText(variant.variantImage),
      size: toNullableText(variant.size),
      color: toNullableText(variant.color),
      stock_total: Math.max(0, Math.floor(toFiniteNumber(variant.stock, toFiniteNumber(product.stock, 0)))),
      cj_stock: Math.max(0, Math.floor(toFiniteNumber(variant.cjStock, 0))),
      factory_stock: Math.max(0, Math.floor(toFiniteNumber(variant.factoryStock, 0))),
      variant_price_usd: Number(variantPriceUSD.toFixed(4)),
      variant_price_sar: Number(usdToSar(variantPriceUSD).toFixed(4)),
      shipping_price_usd: Number(shippingPriceUSD.toFixed(4)),
      shipping_price_sar: Number(usdToSar(shippingPriceUSD).toFixed(4)),
      total_cost_usd: Number(totalCostUSD.toFixed(4)),
      total_cost_sar: Number(totalCostSAR.toFixed(4)),
      sell_price_usd: Number(sellPriceUSD.toFixed(4)),
      sell_price_sar: Number(sellPriceSAR.toFixed(4)),
      profit_usd: Number(profitUSD.toFixed(4)),
      profit_sar: Number(profitSAR.toFixed(4)),
      margin_percent: Number(marginPercent.toFixed(4)),
      delivery_days: toSafeText(variant.deliveryDays, 'N/A (offline)'),
      logistic_name: toSafeText(variant.logisticName, shippingMethod),
      shipping_country_code: shippingCountryCode,
      shipping_method: shippingMethod,
      all_shipping_options: Array.isArray(variant.allShippingOptions) ? variant.allShippingOptions : null,
      snapshot_version: snapshotVersion,
      updated_at: new Date().toISOString(),
    })
  }

  if (rows.length > 0) return rows

  const fallbackVariantPriceUSD = toFiniteNumber(product.avgPriceUSD ?? product.minPriceUSD, 0)
  if (fallbackVariantPriceUSD <= 0) return rows

  const fallbackVariantSku = toSafeText(product.cjSku, `${pid}-default`)
  const fallbackCostSAR = usdToSar(fallbackVariantPriceUSD)
  const fallbackSellSAR = computeRetailFromLanded(fallbackCostSAR, { margin: profitMargin / 100 })

  rows.push({
    pid,
    variant_id: `${pid}-default`,
    variant_sku: fallbackVariantSku,
    variant_name: 'Default',
    variant_image: null,
    size: null,
    color: null,
    stock_total: Math.max(0, Math.floor(toFiniteNumber(product.stock ?? product.totalStock, 0))),
    cj_stock: 0,
    factory_stock: 0,
    variant_price_usd: Number(fallbackVariantPriceUSD.toFixed(4)),
    variant_price_sar: Number(usdToSar(fallbackVariantPriceUSD).toFixed(4)),
    shipping_price_usd: 0,
    shipping_price_sar: 0,
    total_cost_usd: Number(fallbackVariantPriceUSD.toFixed(4)),
    total_cost_sar: Number(fallbackCostSAR.toFixed(4)),
    sell_price_usd: Number(sarToUsd(fallbackSellSAR).toFixed(4)),
    sell_price_sar: Number(fallbackSellSAR.toFixed(4)),
    profit_usd: Number((sarToUsd(fallbackSellSAR) - fallbackVariantPriceUSD).toFixed(4)),
    profit_sar: Number((fallbackSellSAR - fallbackCostSAR).toFixed(4)),
    margin_percent: Number((profitMargin).toFixed(4)),
    delivery_days: 'N/A (offline)',
    logistic_name: shippingMethod,
    shipping_country_code: shippingCountryCode,
    shipping_method: shippingMethod,
    all_shipping_options: null,
    snapshot_version: snapshotVersion,
    updated_at: new Date().toISOString(),
  })

  return rows
}

export async function POST(req: Request) {
  try {
    const guard = await ensureAdmin()
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: guard.reason }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json({ ok: false, error: 'Supabase admin client not configured' }, { status: 500 })
    }

    const payload = await req.json().catch(() => ({}))
    const productsInput = Array.isArray(payload?.products) ? payload.products : []
    if (productsInput.length === 0) {
      return NextResponse.json({ ok: false, error: 'Request body must include products[]' }, { status: 400 })
    }

    const replaceAll = Boolean(payload?.replace)
    const snapshotVersion = toSafeText(payload?.snapshotVersion, new Date().toISOString())
    const shippingCountryCode = normalizeCountryCode(payload?.shippingCountryCode)
    const shippingMethod = toSafeText(payload?.shippingMethod, 'configured-cheapest')
    const profitMargin = Math.max(1, toFiniteNumber(payload?.profitMargin, 8))

    if (replaceAll) {
      const [{ error: deleteVariantsError }, { error: deleteProductsError }] = await Promise.all([
        supabaseAdmin.from('discover_catalog_variants').delete().gt('id', 0),
        supabaseAdmin.from('discover_catalog_products').delete().not('pid', 'is', null),
      ])

      if (deleteVariantsError) {
        return NextResponse.json({ ok: false, error: `Failed clearing variants: ${deleteVariantsError.message}` }, { status: 500 })
      }

      if (deleteProductsError) {
        return NextResponse.json({ ok: false, error: `Failed clearing products: ${deleteProductsError.message}` }, { status: 500 })
      }
    }

    const nowIso = new Date().toISOString()
    const productRows: Record<string, any>[] = []
    const variantRows: Record<string, any>[] = []

    for (const productInputRaw of productsInput) {
      const product = productInputRaw as InputProduct
      const pid = normalizeCjProductId(product.cjProductId || product.pid || product.productId)
      if (!pid) continue

      const variants = Array.isArray(product.variants)
        ? (product.variants as InputVariant[])
        : []

      const variantPriceCandidates = variants
        .map((variant) => toFiniteNumber(variant.variantPriceUSD ?? variant.variantSellPrice ?? variant.price, 0))
        .filter((value) => value > 0)

      const inferredMinPriceUSD = variantPriceCandidates.length > 0
        ? Math.min(...variantPriceCandidates)
        : 0

      const inferredMaxPriceUSD = variantPriceCandidates.length > 0
        ? Math.max(...variantPriceCandidates)
        : inferredMinPriceUSD

      const minPriceUSD = toFiniteNumber(
        product.minPriceUSD,
        inferredMinPriceUSD > 0 ? inferredMinPriceUSD : toFiniteNumber(product.avgPriceUSD, 0)
      )

      const maxPriceUSD = toFiniteNumber(
        product.maxPriceUSD,
        inferredMaxPriceUSD > 0 ? inferredMaxPriceUSD : minPriceUSD
      )

      const avgPriceUSD = toFiniteNumber(
        product.avgPriceUSD,
        minPriceUSD > 0 && maxPriceUSD > 0
          ? Number(((minPriceUSD + maxPriceUSD) / 2).toFixed(4))
          : minPriceUSD
      )

      const availableSizes = normalizeSizeList(
        [
          ...toStringArray(product.availableSizes),
          ...variants.map((variant) => toSafeText(variant.size, '')).filter(Boolean),
        ],
        { allowNumeric: false }
      )

      const availableColors = Array.from(new Set([
        ...toStringArray(product.availableColors),
        ...variants.map((variant) => toSafeText(variant.color, '')).filter(Boolean),
      ]))

      const stockTotal = Math.max(
        0,
        Math.floor(
          toFiniteNumber(
            product.stock ?? product.totalStock,
            variants.reduce((sum, variant) => sum + Math.max(0, toFiniteNumber(variant.stock, 0)), 0)
          )
        )
      )

      const discoverRank = computeDiscoverRank(product, variants)

      productRows.push({
        pid,
        cj_sku: toNullableText(product.cjSku),
        category_id: toNullableText(product.cjCategoryId ?? product.categoryId),
        category_name: toNullableText(product.categoryName ?? product.category),
        name: toSafeText(product.name ?? product.productName, `Product ${pid}`),
        description: toNullableText(product.description),
        overview: toNullableText(product.overview),
        product_info: toNullableText(product.productInfo),
        size_info: toNullableText(product.sizeInfo),
        product_note: toNullableText(product.productNote),
        packing_list: toNullableText(product.packingList),
        images: toStringArray(product.images),
        video_url: toNullableText(product.videoUrl),
        video_source_url: toNullableText(product.videoSourceUrl),
        video_4k_url: toNullableText(product.video4kUrl),
        video_delivery_mode: toNullableText(product.videoDeliveryMode),
        video_quality_gate_passed: typeof product.videoQualityGatePassed === 'boolean' ? product.videoQualityGatePassed : null,
        video_source_quality_hint: toNullableText(product.videoSourceQualityHint),
        available_sizes: availableSizes,
        available_colors: availableColors,
        available_models: toStringArray(product.availableModels),
        color_image_map: product.colorImageMap && typeof product.colorImageMap === 'object' ? product.colorImageMap : null,
        supplier_rating: toFiniteNumber(product.supplierRating, 0) || null,
        review_count: Math.max(0, Math.floor(toFiniteNumber(product.reviewCount, 0))),
        displayed_rating: toFiniteNumber(product.displayedRating, 0) || null,
        rating_confidence: toFiniteNumber(product.ratingConfidence, 0) || null,
        listed_num: Math.max(0, Math.floor(toFiniteNumber(product.listedNum ?? product.totalSales, 0))),
        stock_total: stockTotal,
        processing_days: toFiniteNumber(product.processingDays, 0) || null,
        delivery_days_min: toFiniteNumber(product.deliveryDaysMin, 0) || null,
        delivery_days_max: toFiniteNumber(product.deliveryDaysMax, 0) || null,
        min_price_usd: Number(minPriceUSD.toFixed(4)),
        max_price_usd: Number(maxPriceUSD.toFixed(4)),
        avg_price_usd: Number(avgPriceUSD.toFixed(4)),
        min_price_sar: Number(usdToSar(minPriceUSD).toFixed(4)),
        max_price_sar: Number(usdToSar(maxPriceUSD).toFixed(4)),
        avg_price_sar: Number(usdToSar(avgPriceUSD).toFixed(4)),
        product_weight_g: toFiniteNumber(product.productWeight, 0) || null,
        pack_length: toFiniteNumber(product.packLength, 0) || null,
        pack_width: toFiniteNumber(product.packWidth, 0) || null,
        pack_height: toFiniteNumber(product.packHeight, 0) || null,
        material: toNullableText(product.material),
        product_type: toNullableText(product.productType),
        origin_country: toNullableText(product.originCountry),
        hs_code: toNullableText(product.hsCode),
        discover_rank: discoverRank,
        snapshot_version: snapshotVersion,
        metadata: product.metadata && typeof product.metadata === 'object' ? product.metadata : null,
        updated_at: nowIso,
      })

      variantRows.push(
        ...buildVariantRows(
          pid,
          product,
          variants,
          snapshotVersion,
          shippingCountryCode,
          shippingMethod,
          profitMargin
        )
      )
    }

    if (productRows.length === 0) {
      return NextResponse.json({ ok: false, error: 'No valid products with PID were provided' }, { status: 400 })
    }

    const productChunks = chunkArray(productRows, 200)
    for (const chunk of productChunks) {
      const { error } = await supabaseAdmin
        .from('discover_catalog_products')
        .upsert(chunk, { onConflict: 'pid' })

      if (error) {
        return NextResponse.json({ ok: false, error: `Product upsert failed: ${error.message}` }, { status: 500 })
      }
    }

    const dedupedVariantRows = new Map<string, Record<string, any>>()
    for (const row of variantRows) {
      const key = `${row.pid}::${row.variant_id}::${row.shipping_country_code}::${row.shipping_method}`
      dedupedVariantRows.set(key, row)
    }

    const variantRowsFinal = Array.from(dedupedVariantRows.values())

    if (variantRowsFinal.length > 0) {
      if (!replaceAll) {
        const uniquePids = Array.from(new Set(productRows.map((row) => row.pid)))
        for (const pidChunk of chunkArray(uniquePids, 400)) {
          const { error } = await supabaseAdmin
            .from('discover_catalog_variants')
            .delete()
            .in('pid', pidChunk)
            .eq('shipping_country_code', shippingCountryCode)
            .eq('shipping_method', shippingMethod)

          if (error) {
            return NextResponse.json({ ok: false, error: `Failed clearing existing variants for refresh: ${error.message}` }, { status: 500 })
          }
        }
      }

      const variantChunks = chunkArray(variantRowsFinal, 300)
      for (const chunk of variantChunks) {
        const { error } = await supabaseAdmin
          .from('discover_catalog_variants')
          .upsert(chunk, { onConflict: 'pid,variant_id,shipping_country_code,shipping_method' })

        if (error) {
          return NextResponse.json({ ok: false, error: `Variant upsert failed: ${error.message}` }, { status: 500 })
        }
      }
    }

    return NextResponse.json({
      ok: true,
      snapshotVersion,
      replace: replaceAll,
      shippingCountryCode,
      shippingMethod,
      productsUpserted: productRows.length,
      variantsUpserted: variantRowsFinal.length,
    })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Import failed' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const guard = await ensureAdmin()
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: guard.reason }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json({ ok: false, error: 'Supabase admin client not configured' }, { status: 500 })
    }

    const [productsCountRes, variantsCountRes, latestProductRes, latestVariantRes] = await Promise.all([
      supabaseAdmin.from('discover_catalog_products').select('pid', { count: 'exact', head: true }),
      supabaseAdmin.from('discover_catalog_variants').select('id', { count: 'exact', head: true }),
      supabaseAdmin
        .from('discover_catalog_products')
        .select('snapshot_version, updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('discover_catalog_variants')
        .select('snapshot_version, updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    return NextResponse.json({
      ok: true,
      counts: {
        products: productsCountRes.count || 0,
        variants: variantsCountRes.count || 0,
      },
      latest: {
        products: latestProductRes.data || null,
        variants: latestVariantRes.data || null,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Failed to fetch catalog stats' }, { status: 500 })
  }
}
