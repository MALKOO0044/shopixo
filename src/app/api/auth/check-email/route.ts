import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { authLimiter, getClientIp } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BodySchema = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
  // Rate limit per IP
  try {
    const ip = getClientIp(req as unknown as Request)
    const lim = await authLimiter.limit(`auth:chk:${ip}`)
    if (!lim.success) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
    }
  } catch {
    // noop (no limiter in local/dev)
  }

  let email: string
  try {
    const json = await req.json()
    ;({ email } = BodySchema.parse(json))
  } catch {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) {
    // Without service key we cannot check; return 200 with unknown
    return NextResponse.json({ exists: null }, { status: 200 })
  }

  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } })

  try {
    // Use generateLink with type 'recovery' which does not send an email here
    const { error } = await admin.auth.admin.generateLink({ type: 'recovery', email })
    if (!error) {
      return NextResponse.json({ exists: true })
    }
    const msg = (error.message || '').toLowerCase()
    if (msg.includes('not found')) {
      return NextResponse.json({ exists: false })
    }
    return NextResponse.json({ error: 'unknown_error' }, { status: 500 })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
