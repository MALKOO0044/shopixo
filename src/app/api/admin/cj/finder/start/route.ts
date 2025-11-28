import { NextResponse } from 'next/server'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { loggerForRequest } from '@/lib/log'
import { createJob } from '@/lib/jobs'
import { hasTable } from '@/lib/db-features'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: Request) {
  const log = loggerForRequest(req)
  try {
    const guard = await ensureAdmin()
    if (!guard.ok) {
      const r = NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }
    
    const hasJobsTable = await hasTable('admin_jobs')
    if (!hasJobsTable) {
      const r = NextResponse.json({ 
        ok: false, 
        error: 'Database tables missing. Please run migrations: admin_jobs, admin_job_items tables required.',
        tablesMissing: true 
      }, { status: 503 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }
    
    let body: any = {}
    try { body = await req.json() } catch {}

    const keywords: string[] = Array.isArray(body.keywords)
      ? body.keywords.map((s: any) => String(s).trim()).filter(Boolean)
      : String(body.keywords || '').split(',').map((s) => s.trim()).filter(Boolean)

    const targetQuantity = Math.max(1, Math.min(2000, Number(body.targetQuantity || 50)))
    const pageSize = Math.max(1, Math.min(50, Number(body.pageSize || 20)))
    const maxPagesPerKeyword = Math.max(1, Math.min(40, Number(body.maxPagesPerKeyword || 5)))

    const params = {
      keywords,
      targetQuantity,
      pageSize,
      maxPagesPerKeyword,
      filters: {
        minRating: body.minRating ? Number(body.minRating) : undefined,
        priceRange: body.priceRange || undefined,
        warehouses: Array.isArray(body.warehouses) ? body.warehouses : undefined,
        sizes: Array.isArray(body.sizes) ? body.sizes : undefined,
        colors: Array.isArray(body.colors) ? body.colors : undefined,
      },
      pricing: {
        margin: typeof body.margin === 'number' ? body.margin : 0.35,
        handlingSar: typeof body.handlingSar === 'number' ? body.handlingSar : 0,
        cjCurrency: (body.cjCurrency || 'USD').toUpperCase(),
      },
      cursor: { kwIndex: 0, pageNum: 1, collected: 0 },
    }

    const job = await createJob('finder', params)
    if (!job) {
      const r = NextResponse.json({ ok: false, error: 'Failed to create job. Ensure database tables exist.' }, { status: 500 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const r = NextResponse.json({ ok: true, jobId: job.id })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'finder start failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
