import { NextResponse } from 'next/server'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { getSetting } from '@/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type CjConfig = {
  email?: string | null
  apiKey?: string | null
  base?: string | null
}

export async function GET(req: Request) {
  try {
    const guard = await ensureAdmin()
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const cfg = await getSetting<CjConfig>('cj_config', { email: null, apiKey: null, base: null })
    
    if (!cfg?.email || !cfg?.apiKey) {
      return NextResponse.json({
        ok: true,
        connected: false,
        error: 'Supplier API not configured'
      })
    }

    const start = Date.now()
    const apiBase = cfg.base || 'https://developers.cjdropshipping.com/api2.0/v1'
    
    try {
      const res = await fetch(`${apiBase}/authentication/getAccessToken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cfg.email, password: cfg.apiKey }),
      })
      
      const latency = Date.now() - start
      const data = await res.json()
      
      if (data.result === true || data.code === 200) {
        return NextResponse.json({
          ok: true,
          connected: true,
          latency: `${latency}ms`
        })
      } else {
        return NextResponse.json({
          ok: true,
          connected: false,
          error: data.message || 'Authentication failed',
          latency: `${latency}ms`
        })
      }
    } catch (e: any) {
      return NextResponse.json({
        ok: true,
        connected: false,
        error: e?.message || 'Connection failed'
      })
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Status check failed' }, { status: 500 })
  }
}
