import { NextResponse } from 'next/server';
import { ensureAdmin } from '@/lib/auth/admin-guard';
import { loggerForRequest } from '@/lib/log';
import { listJobs } from '@/lib/jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const log = loggerForRequest(req);
  try {
    const guard = await ensureAdmin();
    if (!guard.ok) {
      const r = NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
      r.headers.set('x-request-id', log.requestId);
      return r;
    }
    const { searchParams } = new URL(req.url);
    const limit = Math.max(1, Math.min(200, Number(searchParams.get('limit') || '50')));
    const result = await listJobs(limit);
    if (result.tablesMissing) {
      const r = NextResponse.json({ 
        ok: false, 
        error: 'Database tables missing. Please run migrations: admin_jobs, admin_job_items tables required.',
        tablesMissing: true 
      }, { status: 503 });
      r.headers.set('x-request-id', log.requestId);
      return r;
    }
    const r = NextResponse.json({ ok: true, jobs: result.jobs });
    r.headers.set('x-request-id', log.requestId);
    return r;
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'jobs list failed' }, { status: 500 });
    r.headers.set('x-request-id', log.requestId);
    return r;
  }
}
