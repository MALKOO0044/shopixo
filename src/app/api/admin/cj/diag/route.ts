import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/cj/v2';
import { fetchWithMeta } from '@/lib/http';
import { ensureAdmin } from '@/lib/auth/admin-guard';
import { loggerForRequest } from '@/lib/log';

export const runtime = 'nodejs';

function getBase(): string {
  const b = process.env.CJ_API_BASE || 'https://developers.cjdropshipping.com/api2.0/v1';
  return b.replace(/\/$/, '');
}

export async function GET(req: Request) {
  const out: any = { ok: false };
  const log = loggerForRequest(req);
  try {
    const { searchParams } = new URL(req.url);
    const testPid = searchParams.get('pid') || undefined;
    const kw = searchParams.get('kw') || 'dress';

    // Admin guard
    const guard = await ensureAdmin();
    if (!guard.ok) {
      log.warn('cj_diag_unauthorized', { reason: guard.reason });
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    log.info('cj_diag_start', { kw, pid: testPid });

    // 1) Token
    let token: string | null = null;
    try {
      token = await getAccessToken();
      out.tokenObtained = true;
      out.tokenPreview = token ? token.slice(0, 6) + '...' + token.slice(-6) : null;
    } catch (e: any) {
      out.tokenObtained = false;
    }

    // If no token, stop early
    if (!out.tokenObtained) {
      return NextResponse.json({ ok: false, step: 'token', ...out }, { status: 500 });
    }

    // Fetch helper preserving status/ok/body with timeouts & retries
    async function probe(path: string) {
      const url = `${getBase()}${path.startsWith('/') ? '' : '/'}${path}`;
      const r = await fetchWithMeta<any>(url, {
        method: 'GET',
        headers: { 'CJ-Access-Token': token as string },
        cache: 'no-store',
        timeoutMs: 12000,
        retries: 2,
      });
      log.info('cj_diag_probe', { path, status: r.status, ok: r.ok });
      return r;
    }

    out.tests = {};
    out.tests.productList = await probe(`/product/list?keyWords=${encodeURIComponent(kw)}&pageSize=1&pageNum=1`);
    out.tests.queryKeyword = await probe(`/product/query?keyword=${encodeURIComponent(kw)}&pageSize=1&pageNumber=1`);
    out.tests.myProductKeyword = await probe(`/product/myProduct/query?keyword=${encodeURIComponent(kw)}&pageSize=1&pageNumber=1`);
    if (testPid) out.tests.queryPid = await probe(`/product/query?pid=${encodeURIComponent(testPid)}`);

    out.ok = true;
    const resp = NextResponse.json(out);
    resp.headers.set('x-request-id', log.requestId);
    return resp;
  } catch (e: any) {
    out.ok = false;
    out.error = e?.message || String(e);
    log.error('cj_diag_error', { error: out.error });
    const resp = NextResponse.json(out, { status: 500 });
    resp.headers.set('x-request-id', log.requestId);
    return resp;
  }
}
