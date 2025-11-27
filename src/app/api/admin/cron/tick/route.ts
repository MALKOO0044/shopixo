import { NextResponse } from 'next/server'
import { loggerForRequest } from '@/lib/log'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { getSetting } from '@/lib/settings'
import { createJob } from '@/lib/jobs'
import { runJob } from '@/lib/runner'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const log = loggerForRequest(req)
  try {
    const url = new URL(req.url)
    const secret = process.env.CRON_SECRET || ''
    const headerSecret = req.headers.get('x-cron-secret') || url.searchParams.get('secret') || ''

    let authorized = false
    if (secret && headerSecret && headerSecret === secret) authorized = true
    if (!authorized) {
      const guard = await ensureAdmin()
      if (guard.ok) authorized = true
    }
    if (!authorized) {
      const r = NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const settings = await getSetting<any>('scanner_settings', { enabled: false })
    if (!settings?.enabled) {
      const r = NextResponse.json({ ok: true, scannerEnabled: false })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    // Create a scanner job; the actual scan will be handled by a follow-up worker route or next tick
    const job = await createJob('scanner', { source: 'cron', settings })
    let result: any = null
    if (job?.id) {
      try { result = await runJob(job.id) } catch {}
    }
    const r = NextResponse.json({ ok: true, scannerEnabled: true, jobId: job?.id || null, result })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'cron tick failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
