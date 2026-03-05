import { NextResponse } from 'next/server';
import { getAccessToken, probeCjEndpoint } from '@/lib/cj/v2';
import { ensureAdmin } from '@/lib/auth/admin-guard';
import { loggerForRequest } from '@/lib/log';
import { hasTable } from '@/lib/db-features';
import {
  diffCounterSnapshots,
  getRequestCountersSnapshot,
  withRequestCounters,
} from '@/lib/telemetry/request-counters';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  return withRequestCounters(async () => {
    const out: any = { ok: false };
    const log = loggerForRequest(req);
    const requestCounterBefore = getRequestCountersSnapshot();
    const withCallbackTelemetry = <T extends Record<string, any>>(payload: T) => ({
      ...payload,
      cjApiCallbacks: diffCounterSnapshots(requestCounterBefore, getRequestCountersSnapshot()),
    });

    try {
      const { searchParams } = new URL(req.url);
      const testPid = searchParams.get('pid') || undefined;
      const kw = searchParams.get('kw') || 'dress';

      // Admin guard
      const guard = await ensureAdmin();
      if (!guard.ok) {
        log.warn('cj_diag_unauthorized', { reason: guard.reason });
        return NextResponse.json(withCallbackTelemetry({ ok: false, error: 'Unauthorized' }), { status: 401 });
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
        // Provide configuration hints to speed up setup
        out.config = {
          hasCJEmail: !!process.env.CJ_EMAIL,
          hasCJApiKey: !!process.env.CJ_API_KEY,
          hasManualAccessToken: !!process.env.CJ_ACCESS_TOKEN,
          hasIntegrationTokensTable: await hasTable('integration_tokens').catch(() => false),
          base: process.env.CJ_API_BASE ? process.env.CJ_API_BASE.replace(/\/$/, '') : '(using cj/v2 default base)',
        };
        out.error = e?.message || String(e);
      }

      // If no token, stop early
      if (!out.tokenObtained) {
        return NextResponse.json(withCallbackTelemetry({ ok: false, step: 'token', ...out }), { status: 500 });
      }

      // Probe helper: routed through CJ v2 for centralized auth + callback telemetry.
      async function probe(path: string) {
        const r = await probeCjEndpoint<any>(path, {
          method: 'GET',
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
      const resp = NextResponse.json(withCallbackTelemetry(out));
      resp.headers.set('x-request-id', log.requestId);
      return resp;
    } catch (e: any) {
      out.ok = false;
      out.error = e?.message || String(e);
      log.error('cj_diag_error', { error: out.error });
      const resp = NextResponse.json(withCallbackTelemetry(out), { status: 500 });
      resp.headers.set('x-request-id', log.requestId);
      return resp;
    }
  });
}
