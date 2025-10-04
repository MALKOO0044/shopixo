import { NextResponse } from 'next/server'
import { shippingLimiter, getClientIp } from '@/lib/ratelimit'
import { loggerForRequest } from '@/lib/log'
import { freightCalculate, type CjFreightCalcParams } from '@/lib/cj/v2'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: Request) {
  const log = loggerForRequest(req)
  try {
    const ip = getClientIp(req)
    const { success } = await shippingLimiter.limit(`ship:${ip}`)
    if (!success) {
      const r = NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    let body: any = {}
    try { body = await req.json() } catch {}

    const params: CjFreightCalcParams = {
      countryCode: String(body.countryCode || body.country || 'SA').toUpperCase(),
      zipCode: body.zipCode || body.zip || undefined,
      weightGram: body.weightGram || body.weight || undefined,
      lengthCm: body.lengthCm || body.length || undefined,
      widthCm: body.widthCm || body.width || undefined,
      heightCm: body.heightCm || body.height || undefined,
      quantity: body.quantity ? Number(body.quantity) : 1,
      pid: body.pid || body.productId || undefined,
      sku: body.sku || body.variantSku || undefined,
    }

    if (!params.countryCode) {
      const r = NextResponse.json({ ok: false, error: 'countryCode required' }, { status: 400 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const res = await freightCalculate(params)
    const r = NextResponse.json({ ok: true, options: res.options })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'shipping calc failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
