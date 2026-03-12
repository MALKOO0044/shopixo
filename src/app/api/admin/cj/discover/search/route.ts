import { NextResponse } from 'next/server'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { runOfflineDiscoverSearch } from '@/lib/discover/offline-catalog'
import { loadDiscoverDeletedPids } from '@/lib/discover/deleted-pids'
import { normalizeDiscoverRunFilters } from '@/lib/discover/runs'
import { normalizeCjProductId } from '@/lib/import/normalization'
import { loggerForRequest } from '@/lib/log'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

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

function isBudgetLimitedZeroResult(result: any): boolean {
  const products = Array.isArray(result?.products) ? result.products : []
  const terminationReason = String(result?.debug?.terminationReason || '').trim()
  return (
    products.length === 0 &&
    (terminationReason === 'scan_budget_reached' || terminationReason === 'time_budget_reached')
  )
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
        process.env.DISCOVER_SHIPPING_COUNTRY ||
        process.env.NEXT_PUBLIC_DEFAULT_SHIPPING_COUNTRY ||
        'US'
    )

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

    const offlineResult = await runOfflineDiscoverSearch({
      categoryIds: filters.categoryIds,
      quantity: filters.quantity,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      minStock: filters.minStock,
      minRating: filters.minRating,
      popularity: filters.popularity,
      profitMargin: filters.profitMargin,
      shippingMethod: filters.shippingMethod,
      shippingCountryCode,
      freeShippingOnly: filters.freeShippingOnly,
      mediaMode: filters.mediaMode,
      discoverProfile: filters.discoverProfile,
      existingProductPolicy: filters.existingProductPolicy,
      requestedSizes: filters.sizes,
      isBatchMode: false,
      batchSize: filters.batchSize,
      remainingNeeded: filters.quantity,
      cursorParam: 'offline.0',
      seenPidsFromClient,
      deletedExcludedPids,
    })

    if (!offlineResult.ok) {
      const r = NextResponse.json(
        {
          ok: false,
          error: offlineResult.error || 'Discover search failed',
          products: [],
          count: 0,
          requestedQuantity: filters.quantity,
          quantityFulfilled: false,
          discoverEngine: 'offline',
          mediaMode: filters.mediaMode,
          discoverProfile: filters.discoverProfile,
          shippingCountryCode,
          duration: Date.now() - startedAt,
          debug: {
            offline: offlineResult.debug,
          },
        },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      )
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    let effectiveOfflineResult = offlineResult
    let recovery: Record<string, unknown> | null = null

    if (isBudgetLimitedZeroResult(offlineResult)) {
      const retryCursor =
        typeof offlineResult.nextCursor === 'string' && offlineResult.nextCursor.trim()
          ? offlineResult.nextCursor.trim()
          : 'offline.0'

      if (retryCursor !== 'offline.0') {
        const retrySeenPids = new Set<string>(seenPidsFromClient)
        for (const attemptedPid of offlineResult.attemptedPids || []) {
          const normalized = normalizeCjProductId(attemptedPid)
          if (normalized) retrySeenPids.add(normalized)
        }

        const retryResult = await runOfflineDiscoverSearch({
          categoryIds: filters.categoryIds,
          quantity: filters.quantity,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          minStock: filters.minStock,
          minRating: filters.minRating,
          popularity: filters.popularity,
          profitMargin: filters.profitMargin,
          shippingMethod: filters.shippingMethod,
          shippingCountryCode,
          freeShippingOnly: filters.freeShippingOnly,
          mediaMode: filters.mediaMode,
          discoverProfile: filters.discoverProfile,
          existingProductPolicy: filters.existingProductPolicy,
          requestedSizes: filters.sizes,
          isBatchMode: false,
          batchSize: filters.batchSize,
          remainingNeeded: filters.quantity,
          cursorParam: retryCursor,
          seenPidsFromClient: retrySeenPids,
          deletedExcludedPids,
        })

        recovery = {
          attempted: true,
          triggerTermination: String(offlineResult?.debug?.terminationReason || ''),
          retryCursor,
          retryOk: retryResult.ok,
          retryTermination: String(retryResult?.debug?.terminationReason || ''),
          retryCount: Array.isArray(retryResult?.products) ? retryResult.products.length : 0,
        }

        if (retryResult.ok && Array.isArray(retryResult.products) && retryResult.products.length > 0) {
          effectiveOfflineResult = retryResult
        }
      } else {
        recovery = {
          attempted: false,
          reason: 'retry_cursor_not_advanced',
          triggerTermination: String(offlineResult?.debug?.terminationReason || ''),
        }
      }
    }

    const products = Array.isArray(effectiveOfflineResult.products) ? effectiveOfflineResult.products : []
    const quantityFulfilled = products.length >= filters.quantity
    const shortfallReason =
      !quantityFulfilled
        ? effectiveOfflineResult.shortfallReason ||
          `Found ${products.length}/${filters.quantity} products. Not enough matching products in this category.`
        : null

    const r = NextResponse.json(
      {
        ok: true,
        products,
        count: products.length,
        requestedQuantity: filters.quantity,
        quantityFulfilled,
        shortfallReason,
        discoverEngine: 'offline',
        mediaMode: filters.mediaMode,
        discoverProfile: filters.discoverProfile,
        shippingCountryCode,
        duration: Date.now() - startedAt,
        debug: {
          offline: effectiveOfflineResult.debug,
          ...(recovery ? { recovery } : {}),
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'discover search failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
