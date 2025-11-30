import { NextResponse } from 'next/server';
import { queryProductByPidOrKeyword, mapCjItemToProductLike, getAccessToken } from '@/lib/cj/v2';
import { ensureAdmin } from '@/lib/auth/admin-guard';
import { fetchWithMeta, fetchJson } from '@/lib/http';
import { loggerForRequest } from '@/lib/log';
import { classifyQuery, matchProductName } from '@/lib/search/keyword-lexicon';
import { throttleCjRequest } from '@/lib/cj/rate-limit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for product queries

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
    const res = await throttleCjRequest(() => fetchJson<any>(`${base}/product/list?${params}`, {
      headers: {
        'CJ-Access-Token': token,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      timeoutMs: 20000,
    }));
    
    console.log(`[CJ Keyword Fetch] keyword="${keyword}", page=${pageNum}, code=${res?.code}, result=${res?.result}, total=${res?.data?.total || 0}, items=${res?.data?.list?.length || 0}`);
    
    if (res?.code === 200 && res?.result && Array.isArray(res?.data?.list)) {
      return {
        list: res.data.list,
        total: res.data.total || 0,
      };
    }
    
    if (res?.message) {
      console.log(`[CJ Keyword Fetch] Error message: ${res.message}`);
    }
    
    return { list: [], total: 0 };
  } catch (e: any) {
    console.log(`[CJ Keyword Fetch] Error for "${keyword}": ${e?.message}`);
    return { list: [], total: 0 };
  }
}

async function fetchCjProductsByCategoryId(token: string, base: string, categoryId: string, pageNum: number, pageSize: number): Promise<{ list: any[]; total: number }> {
  const body = {
    categoryId: categoryId,
    pageNum: pageNum,
    pageSize: pageSize,
  };
  
  console.log(`[CJ Category Fetch] Starting request: categoryId=${categoryId}, page=${pageNum}, pageSize=${pageSize}`);
  console.log(`[CJ Category Fetch] Token preview: ${token ? token.substring(0, 20) + '...' : 'EMPTY'}`);
  console.log(`[CJ Category Fetch] URL: ${base}/product/list`);
  console.log(`[CJ Category Fetch] Body: ${JSON.stringify(body)}`);
  
  try {
    const data = await throttleCjRequest(async () => {
      const res = await fetch(`${base}/product/list`, {
        method: 'POST',
        headers: {
          'CJ-Access-Token': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        cache: 'no-store',
      });
      const jsonData = await res.json();
      console.log(`[CJ Category Fetch] Raw response status: ${res.status}, ok: ${res.ok}`);
      return jsonData;
    });
    console.log(`[CJ Category Fetch] Response: categoryId=${categoryId}, page=${pageNum}, code=${data?.code}, result=${data?.result}, message=${data?.message || 'none'}, total=${data?.data?.total || 0}, items=${data?.data?.list?.length || 0}`);
    
    if (data?.code === 200 && data?.result && Array.isArray(data?.data?.list)) {
      return {
        list: data.data.list,
        total: data.data.total || 0,
      };
    }
    
    // Log the error message if failed
    if (data?.message) {
      console.log(`[CJ Category Fetch] Error message: ${data.message}`);
    }
    
    return { list: [], total: 0 };
  } catch (e: any) {
    console.log(`[CJ Category Fetch] Error for ${categoryId}: ${e?.message}`);
    return { list: [], total: 0 };
  }
}

export async function GET(req: Request) {
  console.log('[Product Query] Request received');
  const log = loggerForRequest(req);
  try {
    console.log('[Product Query] Checking admin auth...');
    const guard = await ensureAdmin();
    if (!guard.ok) {
      console.log('[Product Query] Auth failed:', guard.reason);
      const r = NextResponse.json({ ok: false, version: 'query-v5', error: guard.reason }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
      r.headers.set('x-request-id', log.requestId);
      return r;
    }
    console.log('[Product Query] Auth passed for user:', (guard.user as any)?.email);
    const { searchParams } = new URL(req.url);
    let pid = searchParams.get('pid') || undefined;
    const keyword = searchParams.get('keyword') || undefined;
    const urlParam = searchParams.get('url') || undefined;
    const categoryId = searchParams.get('category') || undefined;
    const categoryIds = searchParams.get('categoryIds') || undefined;
    const quantity = Math.max(1, Number(searchParams.get('quantity') || 25));
    const strictMode = searchParams.get('strict') !== 'false';
    const minRating = Number(searchParams.get('minRating') || 0);
    const includeUnratedParam = searchParams.get('includeUnrated');
    // Always include unrated products by default - only filter out products that HAVE a rating below threshold
    const includeUnrated = includeUnratedParam === 'false' ? false : true;
    const minStock = Number(searchParams.get('minStock') || 0);
    const minPrice = Number(searchParams.get('minPrice') || 0);
    const maxPrice = Number(searchParams.get('maxPrice') || 0);
    
    if (!pid && urlParam) pid = extractPidFromUrl(urlParam);
    if (!pid && urlParam) {
      pid = await extractGuidPidFromCjHtml(urlParam);
    }

    if (!pid && !keyword && !categoryIds) {
      const r = NextResponse.json({ ok: false, error: 'Provide pid, keyword, or categoryIds' }, { status: 400 });
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
      console.log(`[Search v5] Keyword: "${keyword}", Required Concepts: [${Array.from(requiredConcepts).join(', ')}], Gender Exclusions: [${genderExclusions.join(', ')}], Target: ${quantity}, Strict: ${strictMode}, MinRating: ${minRating}, IncludeUnrated: ${includeUnrated}, MinStock: ${minStock}, MinPrice: ${minPrice}, MaxPrice: ${maxPrice}`);
      
      let skippedLowStock = 0;
      let skippedPrice = 0;
      
      const pageSize = 50;
      const maxPagesForQuantity = Math.ceil(quantity * 20 / pageSize);
      const maxPages = Math.min(2000, Math.max(100, maxPagesForQuantity));
      
      let allRawItems: any[] = [];
      let strictMatchedItems: any[] = [];
      let relaxedMatchedItems: any[] = [];
      const seenPids = new Set<string>();
      const startTime = Date.now();
      const maxDurationMs = quantity > 1000 ? 180000 : (quantity > 500 ? 120000 : 90000);
      // CRITICAL: Hard timeout to prevent Vercel function timeout
      const hardTimeoutMs = 12000; // 12 seconds - well under Vercel's limit
      let timedOut = false;
      
      console.log(`[Search v5] Config: maxPages=${maxPages}, maxDuration=${maxDurationMs}ms, pageSize=${pageSize}, hardTimeout=${hardTimeoutMs}ms`);
      
      for (let page = 1; page <= maxPages; page++) {
        if (Date.now() - startTime > hardTimeoutMs) {
          console.log(`[Search v5] Hard timeout reached after ${page - 1} pages, ${strictMatchedItems.length} strict, ${relaxedMatchedItems.length} relaxed`);
          timedOut = true;
          break;
        }
        if (Date.now() - startTime > maxDurationMs) {
          console.log(`[Search v5] Timeout reached after ${page - 1} pages, ${strictMatchedItems.length} strict, ${relaxedMatchedItems.length} relaxed`);
          timedOut = true;
          break;
        }
        
        const pageResult = await fetchCjProductPage(token, base, keyword, categoryId, page, pageSize);
        
        // Check timeout AFTER fetch completes
        if (Date.now() - startTime > hardTimeoutMs) {
          console.log(`[Search v5] Hard timeout (${Date.now() - startTime}ms) after fetch for page ${page}`);
          timedOut = true;
          // Process results from this page then exit
        }
        
        pagesFetched++;
        totalRawFetched += pageResult.list.length;
        
        if (pageResult.list.length === 0) {
          console.log(`[Search v5] Empty page at ${page}, stopping`);
          break;
        }
        
        if (page === 1) {
          totalFound = pageResult.total;
          console.log(`[Search v5] CJ reports ${totalFound} total products available`);
        }
        
        for (const rawItem of pageResult.list) {
          const itemPid = String(rawItem.pid || rawItem.productId || rawItem.id || '');
          if (seenPids.has(itemPid)) continue;
          seenPids.add(itemPid);
          
          allRawItems.push(rawItem);
          
          const supplierRating = Number(rawItem.supplierScore || rawItem.supplierRating || rawItem.score || rawItem.rating || rawItem.productScore || 0);
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
          
          // Apply stock filter from raw item before mapping
          // Only filter if stock data is actually present in the response
          const rawStock = rawItem.stock ?? rawItem.inventory ?? rawItem.listingCount ?? rawItem.listedNum ?? rawItem.quantity;
          const itemStock = rawStock !== undefined ? Number(rawStock) : -1; // -1 means no stock data
          if (minStock > 0 && itemStock >= 0 && itemStock < minStock) {
            skippedLowStock++;
            continue;
          }
          
          // Apply price filter from raw item before mapping
          const itemPrice = Number(rawItem.sellPrice ?? rawItem.price ?? rawItem.salePrice ?? rawItem.costPrice ?? 0);
          if (minPrice > 0 && itemPrice > 0 && itemPrice < minPrice) {
            skippedPrice++;
            continue;
          }
          if (maxPrice > 0 && itemPrice > 0 && itemPrice > maxPrice) {
            skippedPrice++;
            continue;
          }
          
          const mappedItem = mapCjItemToProductLike(rawItem);
          if (!mappedItem) continue;
          
          (mappedItem as any).supplierRating = hasRating ? supplierRating : null;
          (mappedItem as any).hasRating = hasRating;
          (mappedItem as any).totalStock = itemStock >= 0 ? itemStock : null;
          (mappedItem as any).avgPrice = itemPrice > 0 ? itemPrice : null;
          
          if (strictMode && searchTokens.length > 0 && requiredConcepts.size > 0) {
            const strictResult = smartMatch(mappedItem.name || '', keyword, false);
            const relaxedResult = smartMatch(mappedItem.name || '', keyword, true);
            (mappedItem as any)._matchScore = strictResult.score;
            (mappedItem as any)._matchRatio = strictResult.matchRatio;
            
            if (strictResult.matches) {
              strictMatchedItems.push(mappedItem);
            } else if (relaxedResult.matches) {
              relaxedMatchedItems.push(mappedItem);
            } else if (!strictResult.hasProductMatch) {
              // Fallback: if matcher couldn't identify any product concepts, accept the item
              // This handles cases where CJ product names don't match our lexicon
              (mappedItem as any)._matchScore = 0;
              (mappedItem as any)._matchRatio = 0;
              relaxedMatchedItems.push(mappedItem);
            } else {
              skippedNoMatch++;
            }
          } else {
            strictMatchedItems.push(mappedItem);
          }
        }
        
        if (page % 20 === 0 || page === 1) {
          console.log(`[Search v5] Page ${page}/${maxPages}: ${strictMatchedItems.length} strict, ${relaxedMatchedItems.length} relaxed, target: ${quantity}, raw: ${totalRawFetched}`);
        }
        
        const totalMatched = strictMatchedItems.length + relaxedMatchedItems.length;
        if (totalMatched >= quantity) {
          console.log(`[Search v5] Target reached with ${totalMatched} matches after ${page} pages`);
          break;
        }
        
        if (pageResult.list.length < pageSize) {
          console.log(`[Search v5] Partial page at ${page} (${pageResult.list.length}/${pageSize}), stopping`);
          break;
        }
        
        // Exit loop if timed out
        if (timedOut) {
          console.log(`[Search v5] Exiting after timeout with ${strictMatchedItems.length} strict, ${relaxedMatchedItems.length} relaxed`);
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
      items = combined.slice(0, quantity);
      
      const duration = Date.now() - startTime;
      console.log(`[Search v5] Final: ${items.length}/${quantity} items from ${pagesFetched} pages in ${duration}ms, timedOut=${timedOut}`);
      console.log(`[Search v5] Stats: raw=${totalRawFetched}, unique=${seenPids.size}, strict=${strictMatchedItems.length}, relaxed=${relaxedMatchedItems.length}`);
      console.log(`[Search v5] Skipped: noRating=${skippedNoRating}, lowRating=${skippedLowRating}, noMatch=${skippedNoMatch}, lowStock=${skippedLowStock}, price=${skippedPrice}`);
      
      // Return early for keyword search with timedOut indicator
      const r = NextResponse.json({ 
        ok: true, 
        version: 'query-v5', 
        count: items.length,
        requested: quantity,
        totalFound,
        pagesFetched,
        timedOut,
        message: timedOut ? 'Search returned partial results due to time limit. Try a more specific keyword.' : undefined,
        stats: {
          rawFetched: totalRawFetched,
          skippedNoRating,
          skippedLowRating,
          skippedNoMatch,
          duration,
        },
        items 
      }, { headers: { 'Cache-Control': 'no-store' } });
      r.headers.set('x-request-id', log.requestId);
      return r;
    } else if (categoryIds) {
      const categoryIdList = categoryIds.split(',').map(id => id.trim()).filter(Boolean);
      console.log(`[Search v5 Category] Category IDs: [${categoryIdList.join(', ')}], Target: ${quantity}, MinRating: ${minRating}, IncludeUnrated: ${includeUnrated}, MinStock: ${minStock}, MinPrice: ${minPrice}, MaxPrice: ${maxPrice}`);
      
      let skippedLowStock = 0;
      let skippedPrice = 0;
      
      console.log('[Search v5 Category] Getting CJ access token...');
      let token: string;
      try {
        token = await getAccessToken();
        console.log('[Search v5 Category] Token obtained: ' + (token ? token.substring(0, 20) + '...' : 'EMPTY'));
      } catch (tokenErr: any) {
        console.error('[Search v5 Category] Token error:', tokenErr?.message);
        throw new Error('Failed to get CJ access token: ' + (tokenErr?.message || 'Unknown error'));
      }
      const base = process.env.CJ_API_BASE || 'https://developers.cjdropshipping.com/api2.0/v1';
      console.log('[Search v5 Category] Using API base:', base);
      
      const pageSize = 50;
      const seenPids = new Set<string>();
      const allItems: any[] = [];
      const startTime = Date.now();
      const maxDurationMs = quantity > 1000 ? 180000 : (quantity > 500 ? 120000 : 90000);
      
      const quantityPerCategory = Math.ceil(quantity / categoryIdList.length);
      const maxPagesPerCategory = Math.min(2000, Math.ceil(quantityPerCategory * 20 / pageSize));
      
      // CRITICAL: Hard timeout to prevent Vercel function timeout
      // Must return results before Vercel cuts off the function (default 10s, max 60s on Pro)
      const hardTimeoutMs = 12000; // 12 seconds - well under Vercel's limit
      
      console.log(`[Search v5 Category] Config: ${categoryIdList.length} categories, ~${quantityPerCategory} per category, maxPages=${maxPagesPerCategory}, hardTimeout=${hardTimeoutMs}ms`);
      
      let timedOut = false;
      
      for (const catId of categoryIdList) {
        if (Date.now() - startTime > hardTimeoutMs) {
          console.log(`[Search v5 Category] Hard timeout reached after ${Date.now() - startTime}ms, stopping to prevent Vercel cutoff`);
          timedOut = true;
          break;
        }
        if (Date.now() - startTime > maxDurationMs) {
          console.log(`[Search v5 Category] Soft timeout reached, stopping`);
          timedOut = true;
          break;
        }
        
        if (allItems.length >= quantity) {
          console.log(`[Search v5 Category] Target reached with ${allItems.length} items`);
          break;
        }
        
        let categoryTotal = 0;
        let categoryItems = 0;
        
        for (let page = 1; page <= maxPagesPerCategory; page++) {
          // Check timeout BEFORE making the fetch call
          if (Date.now() - startTime > hardTimeoutMs) {
            console.log(`[Search v5 Category] Hard timeout (${Date.now() - startTime}ms) before fetch for category ${catId} page ${page}`);
            timedOut = true;
            break;
          }
          if (Date.now() - startTime > maxDurationMs) break;
          if (allItems.length >= quantity) break;
          
          const pageResult = await fetchCjProductsByCategoryId(token, base, catId, page, pageSize);
          
          // Check timeout AFTER fetch completes
          if (Date.now() - startTime > hardTimeoutMs) {
            console.log(`[Search v5 Category] Hard timeout (${Date.now() - startTime}ms) after fetch for category ${catId} page ${page}`);
            timedOut = true;
            // Still process results from this page before breaking
          }
          pagesFetched++;
          totalRawFetched += pageResult.list.length;
          
          if (page === 1) {
            categoryTotal = pageResult.total;
            console.log(`[Search v5 Category] Category ${catId}: ${categoryTotal} products available`);
          }
          
          if (pageResult.list.length === 0) break;
          
          for (const rawItem of pageResult.list) {
            if (allItems.length >= quantity) break;
            
            const itemPid = String(rawItem.pid || rawItem.productId || rawItem.id || '');
            if (seenPids.has(itemPid)) continue;
            seenPids.add(itemPid);
            
            const supplierRating = Number(rawItem.supplierScore || rawItem.supplierRating || rawItem.score || rawItem.rating || rawItem.productScore || 0);
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
            
            // Apply stock filter from raw item before mapping
            // Only filter if stock data is actually present in the response
            const rawStock = rawItem.stock ?? rawItem.inventory ?? rawItem.listingCount ?? rawItem.listedNum ?? rawItem.quantity;
            const itemStock = rawStock !== undefined ? Number(rawStock) : -1; // -1 means no stock data
            if (minStock > 0 && itemStock >= 0 && itemStock < minStock) {
              skippedLowStock++;
              continue;
            }
            
            // Apply price filter from raw item before mapping
            // CJ uses: sellPrice, price, salePrice, costPrice (numeric, not nested object)
            const itemPrice = Number(rawItem.sellPrice ?? rawItem.price ?? rawItem.salePrice ?? rawItem.costPrice ?? 0);
            if (minPrice > 0 && itemPrice > 0 && itemPrice < minPrice) {
              skippedPrice++;
              continue;
            }
            if (maxPrice > 0 && itemPrice > 0 && itemPrice > maxPrice) {
              skippedPrice++;
              continue;
            }
            
            const mappedItem = mapCjItemToProductLike(rawItem);
            if (!mappedItem) continue;
            
            (mappedItem as any).supplierRating = hasRating ? supplierRating : null;
            (mappedItem as any).hasRating = hasRating;
            (mappedItem as any).categoryId = catId;
            (mappedItem as any).totalStock = itemStock >= 0 ? itemStock : null;
            (mappedItem as any).avgPrice = itemPrice > 0 ? itemPrice : null;
            
            allItems.push(mappedItem);
            categoryItems++;
          }
          
          if (pageResult.list.length < pageSize) break;
          
          // Exit page loop if timed out
          if (timedOut) break;
        }
        
        console.log(`[Search v5 Category] Category ${catId}: fetched ${categoryItems} items`);
        
        // Exit category loop if timed out
        if (timedOut) break;
        totalFound += categoryTotal;
      }
      
      allItems.sort((a, b) => {
        const ratingA = (a as any).hasRating ? ((a as any).supplierRating || 0) : -1;
        const ratingB = (b as any).hasRating ? ((b as any).supplierRating || 0) : -1;
        return ratingB - ratingA;
      });
      
      items = allItems.slice(0, quantity);
      
      const duration = Date.now() - startTime;
      console.log(`[Search v5 Category] Final: ${items.length}/${quantity} items from ${pagesFetched} pages in ${duration}ms, timedOut=${timedOut}`);
      console.log(`[Search v5 Category] Skipped: noRating=${skippedNoRating}, lowRating=${skippedLowRating}, lowStock=${skippedLowStock}, price=${skippedPrice}`);
      
      // Return early with timedOut indicator
      const r = NextResponse.json({ 
        ok: true, 
        version: 'query-v5', 
        count: items.length,
        requested: quantity,
        totalFound,
        pagesFetched,
        timedOut,
        message: timedOut ? 'Search returned partial results due to time limit. Try selecting fewer features or reducing filters.' : undefined,
        stats: {
          rawFetched: totalRawFetched,
          skippedNoRating,
          skippedLowRating,
          skippedNoMatch,
          duration,
        },
        items 
      }, { headers: { 'Cache-Control': 'no-store' } });
      r.headers.set('x-request-id', log.requestId);
      return r;
    }

    const r = NextResponse.json({ 
      ok: true, 
      version: 'query-v5', 
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
    console.error('[Search v5] Error:', e?.message);
    const r = NextResponse.json({ ok: false, version: 'query-v5', error: e?.message || 'CJ query failed' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    r.headers.set('x-request-id', loggerForRequest(req).requestId);
    return r;
  }
}
