import { NextResponse } from 'next/server'
import { z } from 'zod'
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

    const Body = z.object({
      countryCode: z.string().min(2).max(3),
      zipCode: z.string().optional().nullable(),
      weightGram: z.number().positive().optional().nullable(),
      lengthCm: z.number().positive().optional().nullable(),
      widthCm: z.number().positive().optional().nullable(),
      heightCm: z.number().positive().optional().nullable(),
      quantity: z.number().int().positive().default(1),
      pid: z.string().optional().nullable(),
      sku: z.string().optional().nullable(),
    })
    let parsed: z.infer<typeof Body>
    try {
      const json = await req.json()
      parsed = Body.parse(json)
    } catch (e: any) {
      const r = NextResponse.json({ ok: false, error: 'Invalid body', details: e?.errors || String(e) }, { status: 400 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const params: CjFreightCalcParams = {
      countryCode: parsed.countryCode.toUpperCase(),
      zipCode: parsed.zipCode || undefined,
      weightGram: parsed.weightGram || undefined,
      lengthCm: parsed.lengthCm || undefined,
      widthCm: parsed.widthCm || undefined,
      heightCm: parsed.heightCm || undefined,
      quantity: parsed.quantity || 1,
      pid: parsed.pid || undefined,
      sku: parsed.sku || undefined,
    }

    const res = await freightCalculate(params)
    if (!res.ok) {
      const r = NextResponse.json({ ok: false, error: res.message, reason: res.reason }, { status: 400 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }
    const r = NextResponse.json({ ok: true, options: res.options, weightUsed: res.weightUsed })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'shipping calc failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
