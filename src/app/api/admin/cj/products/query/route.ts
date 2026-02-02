import { NextResponse } from 'next/server';
import { queryProductByPidOrKeyword, mapCjItemToProductLike, getAccessToken, fetchProductDetailsBatch } from '@/lib/cj/v2';
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

function smartMatch(productName: string, rawQuery: string, relaxed: boolean = false): { matches: boolean; score: number; matchRatio: number; hasProductMatch: boolean; debug?: any } {
  const { requiredConcepts, genderExclusions } = classifyQuery(rawQuery);
  const result = matchProductName(productName, requiredConcepts, genderExclusions);
  
  const hasProductMatch = result.matchedConcepts.size > 0 && 
    Array.from(result.matchedConcepts).some(c => requiredConcepts.has(c));
  
  const matchRatio = requiredConcepts.size > 0 ? result.matchedConcepts.size / requiredConcepts.size : 1;
  
  let matches = result.matches;
  if (relaxed && !matches && requiredConcepts.size > 0) {
    if (hasProductMatch && matchRatio >= 0.5) {
      matches = true;
    }
  }
  
  return { 
    matches, 
    score: result.score,
    matchRatio,
    hasProductMatch,
    debug: {
      productName,
      requiredConcepts: Array.from(requiredConcepts),
      matchedConcepts: Array.from(result.matchedConcepts),
      genderExclusions,
      relaxed,
      matchRatio,
      hasProductMatch,
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
      const r = NextResponse.json({ ok: false, version: 'query-v4', error: guard.reason }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
      r.headers.set('x-request-id', log.requestId);
      return r;
    }
    const { searchParams } = new URL(req.url);
    let pid = searchParams.get('pid') || undefined;
    const keyword = searchParams.get('keyword') || undefined;
    const urlParam = searchParams.get('url') || undefined;
    const categoryId = searchParams.get('category') || undefined;
    const quantity = Math.max(1, Number(searchParams.get('quantity') || 25));
    const strictMode = searchParams.get('strict') !== 'false';
    const minRating = Number(searchParams.get('minRating') || 0);
    const includeUnratedParam = searchParams.get('includeUnrated');
    const includeUnrated = includeUnratedParam === 'true' ? true : (includeUnratedParam === 'false' ? false : (minRating <= 0));
    
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
    let totalRawFetched = 0;
    let skippedNoRating = 0;
    let skippedLowRating = 0;
    let skippedNoMatch = 0;
    
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
      console.log(`[Search v4] Keyword: "${keyword}", Required Concepts: [${Array.from(requiredConcepts).join(', ')}], Gender Exclusions: [${genderExclusions.join(', ')}], Target: ${quantity}, Strict: ${strictMode}, MinRating: ${minRating}, IncludeUnrated: ${includeUnrated}`);
      
      const pageSize = 50;
      const maxPagesForQuantity = Math.ceil(quantity * 20 / pageSize);
      const maxPages = Math.min(2000, Math.max(100, maxPagesForQuantity));
      
      let allRawItems: any[] = [];
      let strictMatchedItems: any[] = [];
      let relaxedMatchedItems: any[] = [];
      const seenPids = new Set<string>();
      const startTime = Date.now();
      const maxDurationMs = quantity > 1000 ? 180000 : (quantity > 500 ? 120000 : 90000);
      
      console.log(`[Search v4] Config: maxPages=${maxPages}, maxDuration=${maxDurationMs}ms, pageSize=${pageSize}`);
      
      for (let page = 1; page <= maxPages; page++) {
        if (Date.now() - startTime > maxDurationMs) {
          console.log(`[Search v4] Timeout reached after ${page - 1} pages, ${strictMatchedItems.length} strict, ${relaxedMatchedItems.length} relaxed`);
          break;
        }
        
        const pageResult = await fetchCjProductPage(token, base, keyword, categoryId, page, pageSize);
        pagesFetched++;
        totalRawFetched += pageResult.list.length;
        
        if (pageResult.list.length === 0) {
          console.log(`[Search v4] Empty page at ${page}, stopping`);
          break;
        }
        
        if (page === 1) {
          totalFound = pageResult.total;
          console.log(`[Search v4] CJ reports ${totalFound} total products available`);
        }
        
        for (const rawItem of pageResult.list) {
          const itemPid = String(rawItem.pid || rawItem.productId || rawItem.id || '');
          if (seenPids.has(itemPid)) continue;
          seenPids.add(itemPid);
          
          allRawItems.push(rawItem);
          
          const supplierRating = Number(rawItem.supplierRating || rawItem.score || rawItem.rating || rawItem.productScore || 0);
          const hasRating = supplierRating > 0;
          
          if (minRating > 0) {
            if (!hasRating) {
              if (!includeUnrated) {
                skippedNoRating++;
                continue;
              }
            } else if (supplierRating < minRating) {
              skippedLowRating++;
              continue;
            }
          }
          
          const mappedItem = mapCjItemToProductLike(rawItem);
          if (!mappedItem) continue;
          
          (mappedItem as any).supplierRating = hasRating ? supplierRating : null;
          (mappedItem as any).hasRating = hasRating;
          
          if (strictMode && searchTokens.length > 0 && requiredConcepts.size > 0) {
            const strictResult = smartMatch(mappedItem.name || '', keyword, false);
            const relaxedResult = smartMatch(mappedItem.name || '', keyword, true);
            (mappedItem as any)._matchScore = strictResult.score;
            (mappedItem as any)._matchRatio = strictResult.matchRatio;
            
            if (strictResult.matches) {
              strictMatchedItems.push(mappedItem);
            } else if (relaxedResult.matches) {
              relaxedMatchedItems.push(mappedItem);
            } else {
              skippedNoMatch++;
            }
          } else {
            strictMatchedItems.push(mappedItem);
          }
        }
        
        if (page % 20 === 0 || page === 1) {
          console.log(`[Search v4] Page ${page}/${maxPages}: ${strictMatchedItems.length} strict, ${relaxedMatchedItems.length} relaxed, target: ${quantity}, raw: ${totalRawFetched}`);
        }
        
        const totalMatched = strictMatchedItems.length + relaxedMatchedItems.length;
        if (totalMatched >= quantity) {
          console.log(`[Search v4] Target reached with ${totalMatched} matches after ${page} pages`);
          break;
        }
        
        if (pageResult.list.length < pageSize) {
          console.log(`[Search v4] Partial page at ${page} (${pageResult.list.length}/${pageSize}), stopping`);
          break;
        }
      }
      
      strictMatchedItems.sort((a, b) => {
        const ratingA = (a as any).hasRating ? ((a as any).supplierRating || 0) : -1;
        const ratingB = (b as any).hasRating ? ((b as any).supplierRating || 0) : -1;
        if (ratingB !== ratingA) return ratingB - ratingA;
        return ((b as any)._matchScore || 0) - ((a as any)._matchScore || 0);
      });
      
      relaxedMatchedItems.sort((a, b) => {
        const ratioA = (a as any)._matchRatio || 0;
        const ratioB = (b as any)._matchRatio || 0;
        if (ratioB !== ratioA) return ratioB - ratioA;
        const ratingA = (a as any).hasRating ? ((a as any).supplierRating || 0) : -1;
        const ratingB = (b as any).hasRating ? ((b as any).supplierRating || 0) : -1;
        if (ratingB !== ratingA) return ratingB - ratingA;
        return ((b as any)._matchScore || 0) - ((a as any)._matchScore || 0);
      });
      
      const combined = [...strictMatchedItems, ...relaxedMatchedItems];
      const selectedItems = combined.slice(0, quantity);
      
      // CRITICAL: Hydrate selected products with full details (images + variants)
      // The /product/list endpoint only returns 1-2 thumbnail images
      // We need to call /product/query and /product/variant/query for full data
      const pidsToHydrate = selectedItems.map(item => item.productId).filter(Boolean);
      console.log(`[Search v4] Hydrating ${pidsToHydrate.length} products with full details...`);
      
      const detailsMap = await fetchProductDetailsBatch(pidsToHydrate, 5);
      
      // Re-map products using full detail data
      const hydratedItems: any[] = [];
      for (const item of selectedItems) {
        const pid = item.productId;
        const fullDetails = detailsMap.get(pid);
        
        if (fullDetails) {
          // Map the full details which include all images and variants
          const hydratedItem = mapCjItemToProductLike(fullDetails);
          if (hydratedItem) {
            // Preserve metadata from original match
            (hydratedItem as any).supplierRating = (item as any).supplierRating;
            (hydratedItem as any).hasRating = (item as any).hasRating;
            (hydratedItem as any)._matchScore = (item as any)._matchScore;
            (hydratedItem as any)._matchRatio = (item as any)._matchRatio;
            hydratedItems.push(hydratedItem);
            console.log(`[Search v4] Hydrated ${pid}: ${hydratedItem.images.length} images, ${hydratedItem.variants.length} variants`);
          } else {
            // Fallback to original if mapping fails
            hydratedItems.push(item);
          }
        } else {
          // Fallback to original if details fetch failed
          hydratedItems.push(item);
          console.log(`[Search v4] Using original for ${pid} (details fetch failed)`);
        }
      }
      
      items = hydratedItems;
      
      const duration = Date.now() - startTime;
      console.log(`[Search v4] Final: ${items.length}/${quantity} items from ${pagesFetched} pages in ${duration}ms`);
      console.log(`[Search v4] Stats: raw=${totalRawFetched}, unique=${seenPids.size}, strict=${strictMatchedItems.length}, relaxed=${relaxedMatchedItems.length}`);
      console.log(`[Search v4] Skipped: noRating=${skippedNoRating}, lowRating=${skippedLowRating}, noMatch=${skippedNoMatch}`);
      console.log(`[Search v4] Hydration: ${detailsMap.size}/${pidsToHydrate.length} products successfully hydrated with full details`);
    }

    const r = NextResponse.json({ 
      ok: true, 
      version: 'query-v4', 
      count: items.length,
      requested: quantity,
      totalFound,
      pagesFetched,
      stats: {
        rawFetched: totalRawFetched,
        skippedNoRating,
        skippedLowRating,
        skippedNoMatch,
      },
      items 
    }, { headers: { 'Cache-Control': 'no-store' } });
    r.headers.set('x-request-id', log.requestId);
    return r;
  } catch (e: any) {
    console.error('[Search v4] Error:', e?.message);
    const r = NextResponse.json({ ok: false, version: 'query-v4', error: e?.message || 'CJ query failed' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    r.headers.set('x-request-id', loggerForRequest(req).requestId);
    return r;
  }
}
