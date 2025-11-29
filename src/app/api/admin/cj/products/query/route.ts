import { NextResponse } from 'next/server';
import { queryProductByPidOrKeyword, mapCjItemToProductLike, getAccessToken } from '@/lib/cj/v2';
import { ensureAdmin } from '@/lib/auth/admin-guard';
import { fetchWithMeta, fetchJson } from '@/lib/http';
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
  } catch {}
  return undefined;
}

function isRelevant(productName: string, keyword: string): boolean {
  const name = productName.toLowerCase();
  const kw = keyword.toLowerCase();
  const keywords = kw.split(/\s+/).filter(w => w.length > 2);
  if (keywords.length === 0) return true;
  
  const matchCount = keywords.filter(w => name.includes(w)).length;
  return matchCount >= Math.ceil(keywords.length * 0.5);
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
    const categoryId = searchParams.get('category') || undefined;
    const quantity = Math.min(100, Math.max(10, Number(searchParams.get('quantity') || 25)));
    
    if (!pid && urlParam) pid = extractPidFromUrl(urlParam);
    if (!pid && urlParam) {
      pid = await extractGuidPidFromCjHtml(urlParam);
    }

    if (!pid && !keyword) {
      const r = NextResponse.json({ ok: false, error: 'Provide pid or keyword' }, { status: 400 });
      r.headers.set('x-request-id', log.requestId);
      return r;
    }

    let raw: any;
    let totalFound = 0;
    
    if (pid) {
      raw = await queryProductByPidOrKeyword({ pid, keyword });
    } else if (keyword) {
      const token = await getAccessToken();
      const base = process.env.CJ_API_BASE || 'https://developers.cjdropshipping.com/api2.0/v1';
      
      const params = new URLSearchParams();
      params.set('keyWords', keyword);
      params.set('pageSize', String(Math.min(50, quantity)));
      params.set('pageNum', '1');
      if (categoryId && categoryId !== 'all') {
        params.set('categoryId', categoryId);
      }
      
      const listRes = await fetchJson<any>(`${base}/product/list?${params}`, {
        headers: {
          'CJ-Access-Token': token,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        timeoutMs: 15000,
      });
      
      totalFound = listRes?.data?.total || 0;
      raw = listRes;
    }

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

    let items = (itemsRaw as any[])
      .map((it) => mapCjItemToProductLike(it))
      .filter(Boolean);

    if (keyword && items.length > 0) {
      const filtered = items.filter((it: any) => isRelevant(it?.name || '', keyword));
      if (filtered.length >= Math.min(5, items.length * 0.3)) {
        items = filtered;
      }
    }

    const r = NextResponse.json({ 
      ok: true, 
      version: 'query-v2', 
      count: items.length, 
      totalFound: totalFound || items.length,
      items 
    }, { headers: { 'Cache-Control': 'no-store' } });
    r.headers.set('x-request-id', log.requestId);
    return r;
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, version: 'query-v2', error: e?.message || 'CJ query failed' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    r.headers.set('x-request-id', loggerForRequest(req).requestId);
    return r;
  }
}
