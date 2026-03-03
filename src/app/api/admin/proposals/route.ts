import { NextResponse } from 'next/server'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { loggerForRequest } from '@/lib/log'
import { createClient } from '@supabase/supabase-js'
import { hasTable } from '@/lib/db-features'
import { recordAudit } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function GET(req: Request) {
  const log = loggerForRequest(req)
  try {
    const guard = await ensureAdmin()
    if (!guard.ok) {
      const r = NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }
    const admin = getSupabaseAdmin()
    if (!admin) {
      const r = NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }
    if (!(await hasTable('proposals'))) {
      const r = NextResponse.json({ ok: false, error: 'proposals table missing' }, { status: 400 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined
    const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit') || '50')))
    const offset = Math.max(0, Number(searchParams.get('offset') || '0'))

    let q = admin.from('proposals').select('*').order('created_at', { ascending: false }).range(offset, offset + limit - 1)
    if (status) q = q.eq('status', status)
    const { data, error } = await q
    if (error) {
      const r = NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }
    const r = NextResponse.json({ ok: true, proposals: data || [] })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'list failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}

export async function POST(req: Request) {
  const log = loggerForRequest(req)
  try {
    const guard = await ensureAdmin()
    if (!guard.ok) {
      const r = NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }
    const admin = getSupabaseAdmin()
    if (!admin) {
      const r = NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }
    if (!(await hasTable('proposals'))) {
      const r = NextResponse.json({ ok: false, error: 'proposals table missing' }, { status: 400 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    let body: any = {}
    try { body = await req.json() } catch {}
    const id = body?.id as string | undefined
    const status = body?.status as string | undefined

    if (!id || !status || !['pending','approved','rejected','executed'].includes(status)) {
      const r = NextResponse.json({ ok: false, error: 'Provide id and valid status' }, { status: 400 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const { data, error } = await admin.from('proposals').update({ status }).eq('id', id).select('*').single()
    if (error) {
      const r = NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    try {
      await recordAudit({ action: `proposal_${status}`, entity: 'proposal', entityId: id, userEmail: (guard as any)?.user?.email || null, userId: (guard as any)?.user?.id || null, payload: data })
    } catch {}

    const r = NextResponse.json({ ok: true, proposal: data })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'update failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
