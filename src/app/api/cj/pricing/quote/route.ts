import { NextResponse } from 'next/server'
import { z } from 'zod'
import { loggerForRequest } from '@/lib/log'
import { shippingLimiter, getClientIp } from '@/lib/ratelimit'
import { queryProductByPidOrKeyword, mapCjItemToProductLike, freightCalculate } from '@/lib/cj/v2'
import { loadPricingPolicy } from '@/lib/pricing-policy'
import { computeRetailFromLanded, convertToSar } from '@/lib/pricing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const Body = z.object({
  pid: z.string().min(1),
  sku: z.string().optional(),
  countryCode: z.string().min(2).max(3).default('SA'),
  quantity: z.number().int().positive().default(1),
})

export async function POST(req: Request) {
  const log = loggerForRequest(req)
  try {
    const ip = getClientIp(req)
    const { success } = await shippingLimiter.limit(`price:${ip}`)
    if (!success) {
      const r = NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    let parsed: z.infer<typeof Body>
    try {
      const json = await req.json()
      parsed = Body.parse(json)
    } catch (e: any) {
      const r = NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    // Fetch and map product
    const raw = await queryProductByPidOrKeyword({ pid: parsed.pid })
    const itemRaw = Array.isArray(raw?.data?.list)
      ? raw.data.list[0]
      : Array.isArray(raw?.data?.content)
        ? raw.data.content[0]
        : Array.isArray(raw?.content)
          ? raw.content[0]
          : Array.isArray(raw?.data)
            ? raw.data[0]
            : (raw?.data || raw)
    const mapped = mapCjItemToProductLike(itemRaw)
    if (!mapped) {
      const r = NextResponse.json({ ok: false, error: 'CJ map failed' }, { status: 502 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    // Choose variant cost
    let cost = 0
    let chosenSku: string | undefined = undefined
    if (parsed.sku) {
      const v = (mapped.variants || []).find((x) => x.cjSku === parsed.sku)
      if (v && typeof v.price === 'number') { cost = v.price; chosenSku = v.cjSku || undefined }
    }
    if (!cost) {
      const min = (mapped.variants || []).reduce<{ price: number; sku?: string } | null>((best, v) => {
        const p = typeof v.price === 'number' ? v.price : NaN
        if (isNaN(p)) return best
        if (!best || p < best.price) return { price: p, sku: v.cjSku }
        return best
      }, null)
      cost = min?.price || 0
      chosenSku = min?.sku
    }

    // Freight calculation - use SKU and product weight
    let shippingSar = 0
    let options: any[] = []
    try {
      // Get weight from raw CJ data (packWeight > packingWeight > productWeight)
      const productWeight = Number(itemRaw?.packWeight || itemRaw?.packingWeight || itemRaw?.productWeight || 0);
      
      const fc = await freightCalculate({ 
        countryCode: parsed.countryCode.toUpperCase(), 
        vid: chosenSku || mapped.productId, // Use SKU as identifier
        quantity: parsed.quantity,
        weightGram: productWeight > 0 ? productWeight : undefined
      })
      if (fc.ok) {
        options = fc.options || []
        const cheapest = options.reduce<{ price: number; currency?: string } | null>((best, opt: any) => {
          const p = Number(opt.price || 0)
          if (!best || p < best.price) return { price: p, currency: opt.currency }
          return best
        }, null)
        if (cheapest) shippingSar = convertToSar(cheapest.price, cheapest.currency)
      }
    } catch {}

    const policy = await loadPricingPolicy()
    const landed = Math.max(0, cost) + Math.max(0, shippingSar)
    let retail = computeRetailFromLanded(landed, { margin: policy.margin, roundTo: policy.roundTo, prettyEnding: policy.endings })
    if (retail < policy.floorSar) retail = policy.floorSar

    const r = NextResponse.json({ ok: true, pid: mapped.productId, sku: chosenSku, costSar: cost, shippingSar, retailSar: retail, options })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'pricing failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
