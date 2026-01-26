import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { marketingLimiter, getClientIp } from '@/lib/ratelimit'
import { loggerForRequest } from '@/lib/log'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function isEmail(s: unknown): s is string {
  if (typeof s !== 'string') return false
  const v = s.trim()
  if (!v) return false
  // Simple RFC-compliant-ish pattern
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export async function POST(req: NextRequest) {
  const log = loggerForRequest(req)
  // Rate limit
  try {
    const ip = getClientIp(req as unknown as Request)
    const lim = await marketingLimiter.limit(`newsletter:${ip}`)
    if (!lim.success) {
      const r = NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }
  } catch {}

  const json = await req.json().catch(() => null) as any
  const email = json?.email
  if (!isEmail(email)) {
    const r = NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }

  // Try to persist to Supabase (server-side) if service key configured
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && service) {
    try {
      const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } })
      // Use a generic table name; if not present, swallow error safely
      const { error } = await admin.from('newsletter_subscribers').insert({ email }).single()
      if (error && !String(error.message || '').toLowerCase().includes('relation')) {
        // Unknown failure other than table missing
        console.warn('[newsletter] insert failed', error.message)
      }
    } catch (e) {
      console.warn('[newsletter] supabase insert error', e)
    }
  }

  const r = NextResponse.json({ ok: true })
  r.headers.set('x-request-id', log.requestId)
  return r
}
