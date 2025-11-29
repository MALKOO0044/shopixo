import { NextResponse } from 'next/server';
import { queryProductByPidOrKeyword, mapCjItemToProductLike, getAccessToken } from '@/lib/cj/v2';
import { ensureAdmin } from '@/lib/auth/admin-guard';
import { fetchWithMeta, fetchJson } from '@/lib/http';
import { loggerForRequest } from '@/lib/log';
import { classifyQuery, matchProductName } from '@/lib/search/keyword-lexicon';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenize(text: string): string[] {
  return normalizeText(text).split(' ').filter(w => w.length > 1);
}

function smartMatch(productName: string, rawQuery: string): { matches: boolean; score: number } {
  const { requiredConcepts, genderExclusions } = classifyQuery(rawQuery);
  const result = matchProductName(productName, requiredConcepts, genderExclusions);
  return { matches: result.matches, score: result.score };
}

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

async function fetchCjProductPage(token: string, base: string, keyword: string, categoryId: string | undefined, pageNum: number, pageSize: number): Promise<{ list: any[]; total: number }> {
  const params = new URLSearchParams();
  params.set('keyWords', keyword);
  params.set('pageSize', String(pageSize));
  params.set('pageNum', String(pageNum));
  if (categoryId && categoryId !== 'all') {
    params.set('categoryId', categoryId);
  }
  
  try {
    const res = await fetchJson<any>(`${base}/product/list?${params}`, {
      headers: {
        'CJ-Access-Token': token,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      timeoutMs: 20000,
    });
    return {
      list: res?.data?.list || [],
      total: res?.data?.total || 0,
    };
  } catch {
    return { list: [], total: 0 };
  }
}

export async function GET(req: Request) {
  const log = loggerForRequest(req);
  try {
    const guard = await ensureAdmin();
    if (!guard.ok) {
      const r = NextResponse.json({ ok: false, version: 'query-v3', error: guard.reason }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
      r.headers.set('x-request-id', log.requestId);
      return r;
    }
    const { searchParams } = new URL(req.url);
    let pid = searchParams.get('pid') || undefined;
    const keyword = searchParams.get('keyword') || undefined;
    const urlParam = searchParams.get('url') || undefined;
    const categoryId = searchParams.get('category') || undefined;
    const quantity = Math.min(100, Math.max(10, Number(searchParams.get('quantity') || 25)));
    const strictMode = searchParams.get('strict') !== 'false';
    
    if (!pid && urlParam) pid = extractPidFromUrl(urlParam);
    if (!pid && urlParam) {
      pid = await extractGuidPidFromCjHtml(urlParam);
    }

    if (!pid && !keyword) {
      const r = NextResponse.json({ ok: false, error: 'Provide pid or keyword' }, { status: 400 });
      r.headers.set('x-request-id', log.requestId);
      return r;
    }

    let items: any[] = [];
    let totalFound = 0;
    let pagesFetched = 0;
    
    if (pid) {
      const raw = await queryProductByPidOrKeyword({ pid, keyword });
      const itemsRaw = Array.isArray(raw?.data?.list) ? raw.data.list
        : Array.isArray(raw?.data) ? raw.data
        : raw?.data ? [raw.data] : [];
      items = itemsRaw.map((it: any) => mapCjItemToProductLike(it)).filter(Boolean);
    } else if (keyword) {
      const token = await getAccessToken();
      const base = process.env.CJ_API_BASE || 'https://developers.cjdropshipping.com/api2.0/v1';
      const searchTokens = tokenize(keyword);
      
      console.log(`[Search] Keyword: "${keyword}", Tokens: ${searchTokens.join(', ')}, Target: ${quantity}, Strict: ${strictMode}`);
      
      const pageSize = 50;
      const maxPages = Math.ceil((quantity * 3) / pageSize);
      let allRawItems: any[] = [];
      
      for (let page = 1; page <= maxPages; page++) {
        const pageResult = await fetchCjProductPage(token, base, keyword, categoryId, page, pageSize);
        pagesFetched++;
        
        if (pageResult.list.length === 0) break;
        allRawItems.push(...pageResult.list);
        
        if (page === 1) {
          totalFound = pageResult.total;
        }
        
        if (pageResult.list.length < pageSize) break;
        
        const mapped = allRawItems.map((it: any) => mapCjItemToProductLike(it)).filter(Boolean);
        
        if (strictMode && searchTokens.length > 0) {
          const strictFiltered = mapped.filter((it: any) => {
            const { matches, score } = smartMatch(it?.name || '', keyword);
            (it as any)._matchScore = score;
            return matches;
          });
          
          if (strictFiltered.length >= quantity) {
            items = strictFiltered.slice(0, quantity);
            console.log(`[Search] Found ${strictFiltered.length} strict matches after ${page} pages`);
            break;
          }
        }
        
        if (allRawItems.length >= quantity * 4) break;
      }
      
      if (items.length === 0) {
        const mapped = allRawItems.map((it: any) => mapCjItemToProductLike(it)).filter(Boolean);
        
        if (strictMode && searchTokens.length > 0) {
          const scoredItems = mapped.map((it: any) => {
            const { matches, score } = smartMatch(it?.name || '', keyword);
            return { item: it, matches, score };
          });
          
          const smartMatches = scoredItems.filter(s => s.matches).map(s => s.item);
          
          if (smartMatches.length > 0) {
            items = smartMatches.slice(0, quantity);
          } else {
            const partialMatches = scoredItems
              .filter(s => s.score >= 0.3)
              .sort((a, b) => b.score - a.score)
              .map(s => s.item);
            items = partialMatches.slice(0, quantity);
          }
        } else {
          items = mapped.slice(0, quantity);
        }
      }
      
      console.log(`[Search] Final: ${items.length} items from ${pagesFetched} pages (${allRawItems.length} raw)`);
    }

    const r = NextResponse.json({ 
      ok: true, 
      version: 'query-v3', 
      count: items.length, 
      totalFound,
      pagesFetched,
      items 
    }, { headers: { 'Cache-Control': 'no-store' } });
    r.headers.set('x-request-id', log.requestId);
    return r;
  } catch (e: any) {
    console.error('[Search] Error:', e?.message);
    const r = NextResponse.json({ ok: false, version: 'query-v3', error: e?.message || 'CJ query failed' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    r.headers.set('x-request-id', loggerForRequest(req).requestId);
    return r;
  }
}
