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

function smartMatch(productName: string, rawQuery: string, relaxed: boolean = false): { matches: boolean; score: number; matchRatio: number; debug?: any } {
  const { requiredConcepts, genderExclusions } = classifyQuery(rawQuery);
  const result = matchProductName(productName, requiredConcepts, genderExclusions);
  
  const matchRatio = requiredConcepts.size > 0 ? result.matchedConcepts.size / requiredConcepts.size : 1;
  
  let matches = result.matches;
  if (relaxed && !matches && requiredConcepts.size > 0) {
    if (matchRatio >= 0.5) {
      matches = true;
    }
  }
  
  return { 
    matches, 
    score: result.score,
    matchRatio,
    debug: {
      productName,
      requiredConcepts: Array.from(requiredConcepts),
      matchedConcepts: Array.from(result.matchedConcepts),
      genderExclusions,
      relaxed,
      matchRatio,
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
    const quantity = Math.min(2000, Math.max(1, Number(searchParams.get('quantity') || 25)));
    const strictMode = searchParams.get('strict') !== 'false';
    const minRating = Number(searchParams.get('minRating') || 0);
    
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
      console.log(`[Search] Keyword: "${keyword}", Required Concepts: [${Array.from(requiredConcepts).join(', ')}], Gender Exclusions: [${genderExclusions.join(', ')}], Target: ${quantity}, Strict: ${strictMode}, MinRating: ${minRating}`);
      
      const pageSize = 50;
      const maxPages = Math.min(200, Math.max(50, Math.ceil((quantity * 15) / pageSize)));
      let allRawItems: any[] = [];
      let strictMatchedItems: any[] = [];
      let relaxedMatchedItems: any[] = [];
      const startTime = Date.now();
      const maxDurationMs = 90000;
      
      for (let page = 1; page <= maxPages; page++) {
        if (Date.now() - startTime > maxDurationMs) {
          console.log(`[Search] Timeout reached after ${page - 1} pages, ${strictMatchedItems.length} strict, ${relaxedMatchedItems.length} relaxed`);
          break;
        }
        
        const pageResult = await fetchCjProductPage(token, base, keyword, categoryId, page, pageSize);
        pagesFetched++;
        
        if (pageResult.list.length === 0) break;
        
        if (page === 1) {
          totalFound = pageResult.total;
        }
        
        for (const rawItem of pageResult.list) {
          allRawItems.push(rawItem);
          
          const supplierRating = Number(rawItem.supplierRating || rawItem.score || rawItem.rating || rawItem.productScore || 0);
          
          if (minRating > 0) {
            if (supplierRating === 0 || supplierRating < minRating) {
              continue;
            }
          }
          
          const mappedItem = mapCjItemToProductLike(rawItem);
          if (!mappedItem) continue;
          
          (mappedItem as any).supplierRating = supplierRating > 0 ? supplierRating : undefined;
          
          if (strictMode && searchTokens.length > 0 && requiredConcepts.size > 0) {
            const strictResult = smartMatch(mappedItem.name || '', keyword, false);
            const relaxedResult = smartMatch(mappedItem.name || '', keyword, true);
            (mappedItem as any)._matchScore = strictResult.score;
            (mappedItem as any)._matchRatio = strictResult.matchRatio;
            
            if (strictResult.matches) {
              strictMatchedItems.push(mappedItem);
            } else if (relaxedResult.matches) {
              relaxedMatchedItems.push(mappedItem);
            }
          } else {
            strictMatchedItems.push(mappedItem);
          }
        }
        
        if (page % 10 === 0) {
          console.log(`[Search] Page ${page}: ${strictMatchedItems.length} strict, ${relaxedMatchedItems.length} relaxed, target: ${quantity}`);
        }
        
        if (strictMatchedItems.length >= quantity) {
          console.log(`[Search] Found ${strictMatchedItems.length} strict matches after ${page} pages`);
          break;
        }
        
        const combinedCount = strictMatchedItems.length + relaxedMatchedItems.length;
        if (combinedCount >= quantity * 1.5) {
          console.log(`[Search] Have enough combined matches (${combinedCount}), stopping fetch`);
          break;
        }
        
        if (pageResult.list.length < pageSize) break;
      }
      
      if (strictMatchedItems.length >= quantity) {
        strictMatchedItems.sort((a, b) => ((b as any)._matchScore || 0) - ((a as any)._matchScore || 0));
        items = strictMatchedItems.slice(0, quantity);
        console.log(`[Search] Using ${items.length} strict matches`);
      } else {
        relaxedMatchedItems.sort((a, b) => {
          const ratioA = (a as any)._matchRatio || 0;
          const ratioB = (b as any)._matchRatio || 0;
          if (ratioB !== ratioA) return ratioB - ratioA;
          return ((b as any)._matchScore || 0) - ((a as any)._matchScore || 0);
        });
        
        strictMatchedItems.sort((a, b) => ((b as any)._matchScore || 0) - ((a as any)._matchScore || 0));
        
        const combined = [...strictMatchedItems, ...relaxedMatchedItems];
        items = combined.slice(0, quantity);
        console.log(`[Search] Using ${strictMatchedItems.length} strict + ${Math.max(0, items.length - strictMatchedItems.length)} relaxed = ${items.length} total matches`);
      }
      
      console.log(`[Search] Final: ${items.length} items from ${pagesFetched} pages in ${Date.now() - startTime}ms (${allRawItems.length} raw, strict: ${strictMatchedItems.length}, relaxed: ${relaxedMatchedItems.length})`);
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
