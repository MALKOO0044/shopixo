import { NextResponse } from 'next/server';
import { queryProductByPidOrKeyword, mapCjItemToProductLike } from '@/lib/cj/v2';
import { ensureAdmin } from '@/lib/auth/admin-guard';
import { fetchWithMeta } from '@/lib/http';
import { loggerForRequest } from '@/lib/log';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function extractPidFromUrl(u?: string | null): string | undefined {
  if (!u) return undefined;
  try {
    const url = new URL(u);
    const cand = url.searchParams.get('pid') || url.searchParams.get('productId') || url.searchParams.get('id');
    if (cand) return cand;
    // Fallback: find a long GUID/ID in the URL
    const m = url.href.match(/[0-9A-Fa-f-]{16,}/);
    return m?.[0];
  } catch {
    return undefined;
  }
}

async function extractGuidPidFromCjHtml(u?: string | null): Promise<string | undefined> {
  if (!u) return undefined;
  try {
    const meta = await fetchWithMeta<string>(u, { method: 'GET', cache: 'no-store', timeoutMs: 10000, retries: 1 });
    const html = typeof meta.body === 'string' ? meta.body : '';
    const patterns = [
      /["']pid["']\s*[:=]\s*["']([0-9A-Fa-f\-]{32,36})["']/i,
      /pid=([0-9A-Fa-f\-]{32,36})/i,
      /["']productId["']\s*[:=]\s*["']([0-9A-Fa-f\-]{32,36})["']/i,
      /data-pid=["']([0-9A-Fa-f\-]{32,36})["']/i,
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m && m[1]) return m[1];
    }
  } catch {
    // ignore
  }
  return undefined;
}

export async function GET(req: Request) {
  const log = loggerForRequest(req);
  try {
    const guard = await ensureAdmin();
    if (!guard.ok) {
      const r = NextResponse.json({ ok: false, version: 'query-v2', error: guard.reason }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
      r.headers.set('x-request-id', log.requestId);
      return r;
    }
    const { searchParams } = new URL(req.url);
    let pid = searchParams.get('pid') || undefined;
    const keyword = searchParams.get('keyword') || undefined;
    const urlParam = searchParams.get('url') || undefined;
    if (!pid && urlParam) pid = extractPidFromUrl(urlParam);
    if (!pid && urlParam) {
      // Try fetching CJ product page and extract GUID pid
      pid = await extractGuidPidFromCjHtml(urlParam);
    }

    if (!pid && !keyword) {
      const r = NextResponse.json({ ok: false, error: 'Provide pid or keyword' }, { status: 400 });
      r.headers.set('x-request-id', log.requestId);
      return r;
    }

    const raw = await queryProductByPidOrKeyword({ pid, keyword });

    // Normalize CJ response to an array: supports data.list, data.content, content, data (array), or single object
    const itemsRaw = Array.isArray(raw?.data?.list)
      ? raw.data.list
      : Array.isArray(raw?.data?.content)
        ? raw.data.content
        : Array.isArray(raw?.content)
          ? raw.content
          : Array.isArray(raw?.data)
            ? raw.data
            : Array.isArray(raw)
              ? raw
              : (raw?.data ? [raw.data] : []);

    const items = (itemsRaw as any[])
      .map((it) => mapCjItemToProductLike(it))
      .filter(Boolean);

    const r = NextResponse.json({ ok: true, version: 'query-v2', count: items.length, items }, { headers: { 'Cache-Control': 'no-store' } });
    r.headers.set('x-request-id', log.requestId);
    return r;
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, version: 'query-v2', error: e?.message || 'CJ query failed' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    r.headers.set('x-request-id', loggerForRequest(req).requestId);
    return r;
  }
}
