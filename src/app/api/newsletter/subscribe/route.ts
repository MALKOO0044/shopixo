import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { marketingLimiter, getClientIp } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const Body = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
  // Rate limit
  try {
    const ip = getClientIp(req as unknown as Request)
    const lim = await marketingLimiter.limit(`newsletter:${ip}`)
    if (!lim.success) return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  } catch {}

  let email: string
  try {
    const json = await req.json()
    ;({ email } = Body.parse(json))
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 })
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

  return NextResponse.json({ ok: true })
}
