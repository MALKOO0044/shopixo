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

function smartMatch(productName: string, rawQuery: string, relaxed: boolean = false): { matches: boolean; score: number; debug?: any } {
  const { requiredConcepts, genderExclusions } = classifyQuery(rawQuery);
  const result = matchProductName(productName, requiredConcepts, genderExclusions);
  
  // In relaxed mode, accept partial matches (at least 50% of concepts) or keyword substring match
  let matches = result.matches;
  if (relaxed && !matches && requiredConcepts.size > 0) {
    const matchRatio = result.matchedConcepts.size / requiredConcepts.size;
    if (matchRatio >= 0.5) {
      matches = true;
    } else {
      // Fallback: check if the raw query keywords appear anywhere in the product name
      const queryTokens = rawQuery.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(' ').filter(t => t.length > 2);
      const nameLower = productName.toLowerCase();
      const keywordMatches = queryTokens.filter(t => nameLower.includes(t)).length;
      if (keywordMatches >= Math.ceil(queryTokens.length * 0.5)) {
        matches = true;
      }
    }
  }
  
  return { 
    matches, 
    score: result.score,
    debug: {
      productName,
      requiredConcepts: Array.from(requiredConcepts),
      matchedConcepts: Array.from(result.matchedConcepts),
      genderExclusions,
      relaxed,
    }
  };
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
    const quantity = Math.min(500, Math.max(1, Number(searchParams.get('quantity') || 25)));
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
      
      const { requiredConcepts, genderExclusions } = classifyQuery(keyword);
      console.log(`[Search] Keyword: "${keyword}", Required Concepts: [${Array.from(requiredConcepts).join(', ')}], Gender Exclusions: [${genderExclusions.join(', ')}], Target: ${quantity}, Strict: ${strictMode}`);
      
      const pageSize = 50;
      const maxPages = Math.max(50, Math.ceil((quantity * 15) / pageSize));
      let allRawItems: any[] = [];
      let allProcessedItems: any[] = [];
      let strictMatchedItems: any[] = [];
      let relaxedMatchedItems: any[] = [];
      
      for (let page = 1; page <= maxPages; page++) {
        const pageResult = await fetchCjProductPage(token, base, keyword, categoryId, page, pageSize);
        pagesFetched++;
        
        if (pageResult.list.length === 0) break;
        
        if (page === 1) {
          totalFound = pageResult.total;
        }
        
        const pageItems = pageResult.list.map((it: any) => mapCjItemToProductLike(it)).filter(Boolean);
        allRawItems.push(...pageResult.list);
        allProcessedItems.push(...pageItems);
        
        if (strictMode && searchTokens.length > 0) {
          let pageStrictMatched = 0;
          let pageRelaxedMatched = 0;
          
          for (const it of pageItems) {
            const strictResult = smartMatch(it?.name || '', keyword, false);
            const relaxedResult = smartMatch(it?.name || '', keyword, true);
            (it as any)._matchScore = strictResult.score;
            
            if (strictResult.matches) {
              strictMatchedItems.push(it);
              pageStrictMatched++;
            } else if (relaxedResult.matches) {
              relaxedMatchedItems.push(it);
              pageRelaxedMatched++;
            }
          }
          
          console.log(`[Search] Page ${page}: ${pageStrictMatched} strict, ${pageRelaxedMatched} relaxed. Total strict: ${strictMatchedItems.length}, relaxed: ${relaxedMatchedItems.length}, target: ${quantity}`);
          
          if (strictMatchedItems.length >= quantity) {
            items = strictMatchedItems.slice(0, quantity);
            console.log(`[Search] Found ${strictMatchedItems.length} strict matches after ${page} pages`);
            break;
          }
          
          const combinedCount = strictMatchedItems.length + relaxedMatchedItems.length;
          if (combinedCount >= quantity * 1.5) {
            console.log(`[Search] Have enough combined matches (${combinedCount}), stopping fetch`);
            break;
          }
        } else {
          strictMatchedItems.push(...pageItems);
          if (strictMatchedItems.length >= quantity) {
            items = strictMatchedItems.slice(0, quantity);
            break;
          }
        }
        
        if (items.length >= quantity) break;
        if (pageResult.list.length < pageSize) break;
      }
      
      if (items.length === 0) {
        if (strictMatchedItems.length >= quantity) {
          items = strictMatchedItems.slice(0, quantity);
          console.log(`[Search] Using ${items.length} strict matches`);
        } else if (strictMatchedItems.length > 0 || relaxedMatchedItems.length > 0) {
          const combined = [...strictMatchedItems, ...relaxedMatchedItems];
          combined.sort((a, b) => ((b as any)._matchScore || 0) - ((a as any)._matchScore || 0));
          items = combined.slice(0, quantity);
          console.log(`[Search] Using ${strictMatchedItems.length} strict + ${relaxedMatchedItems.length} relaxed = ${items.length} total matches from ${pagesFetched} pages`);
        } else {
          const mapped = allProcessedItems.slice(0, quantity);
          items = mapped;
          console.log(`[Search] No strict/relaxed matches, using ${items.length} raw products from ${pagesFetched} pages`);
        }
      }
      
      console.log(`[Search] Final: ${items.length} items from ${pagesFetched} pages (${allRawItems.length} raw, strict: ${strictMatchedItems.length}, relaxed: ${relaxedMatchedItems.length})`);
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
