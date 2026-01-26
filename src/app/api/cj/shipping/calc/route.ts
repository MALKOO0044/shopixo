import { NextResponse } from 'next/server'
import { z } from 'zod'
import { shippingLimiter, getClientIp } from '@/lib/ratelimit'
import { loggerForRequest } from '@/lib/log'
import { freightCalculate } from '@/lib/cj/v2'

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

    // Uses CJ's "According to Shipping Method" - exact pre-calculated shipping options
    const Body = z.object({
      countryCode: z.string().min(2).max(3),
      quantity: z.number().int().positive().default(1),
      vid: z.string().min(1), // variant ID (UUID) - required for exact CJ shipping data
    })
    let parsed: z.infer<typeof Body>
    try {
      const json = await req.json()
      parsed = Body.parse(json)
    } catch (e: any) {
      const r = NextResponse.json({ ok: false, error: 'Invalid body - vid (variant UUID) is required', details: e?.errors || String(e) }, { status: 400 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const res = await freightCalculate({
      countryCode: parsed.countryCode.toUpperCase(),
      quantity: parsed.quantity,
      vid: parsed.vid,
    })
    
    if (!res.ok) {
      const r = NextResponse.json({ ok: false, error: res.message, reason: res.reason }, { status: 400 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }
    
    const r = NextResponse.json({ ok: true, options: res.options })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'shipping calc failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
