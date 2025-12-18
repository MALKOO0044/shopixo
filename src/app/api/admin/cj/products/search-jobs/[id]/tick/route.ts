import { NextRequest, NextResponse } from 'next/server';
import { getSearchJob, updateJobProgress, completeJob, failJob } from '@/lib/db/search-jobs';
import { getAccessToken } from '@/lib/cj/v2';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Pro allows up to 60s

const CJ_API_BASE = process.env.CJ_API_BASE || 'https://developers.cjdropshipping.com/api2.0/v1';

// Resolve synthetic category IDs to real CJ IDs
async function resolveToRealCategoryIds(categoryIds: string[]): Promise<string[]> {
  const realIds: string[] = [];
  const syntheticIds: string[] = [];
  
  for (const id of categoryIds) {
    if (id.startsWith('first-') || id.startsWith('second-')) {
      syntheticIds.push(id);
    } else {
      realIds.push(id);
    }
  }
  
  if (syntheticIds.length === 0) {
    return realIds;
  }
  
  // Fetch category tree to resolve synthetic IDs
  try {
    const token = await getAccessToken();
    if (!token) return realIds;
    
    const res = await fetch(`${CJ_API_BASE}/product/getCategory`, {
      headers: { 'CJ-Access-Token': token },
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    
    if (data.code !== 200 || !data.data) return realIds;
    
    const rawCategories = Array.isArray(data.data) ? data.data : [];
    
    // Parse synthetic IDs and find real children
    for (const syntheticId of syntheticIds) {
      if (syntheticId.startsWith('first-')) {
        // first-X means index X in top-level
        const idx = parseInt(syntheticId.replace('first-', ''), 10);
        const firstLevel = rawCategories[idx];
        if (firstLevel?.categoryFirstList) {
          for (const secondLevel of firstLevel.categoryFirstList) {
            if (secondLevel?.categorySecondList) {
              for (const thirdLevel of secondLevel.categorySecondList) {
                if (thirdLevel?.categoryId) {
                  realIds.push(thirdLevel.categoryId);
                }
              }
            }
          }
        }
      } else if (syntheticId.startsWith('second-')) {
        // second-X-Y means index X in first level, Y in second level
        const parts = syntheticId.replace('second-', '').split('-');
        const firstIdx = parseInt(parts[0], 10);
        const secondIdx = parseInt(parts[1], 10);
        const firstLevel = rawCategories[firstIdx];
        if (firstLevel?.categoryFirstList) {
          const secondLevel = firstLevel.categoryFirstList[secondIdx];
          if (secondLevel?.categorySecondList) {
            for (const thirdLevel of secondLevel.categorySecondList) {
              if (thirdLevel?.categoryId) {
                realIds.push(thirdLevel.categoryId);
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('[Tick] Failed to resolve category IDs:', e);
  }
  
  return realIds;
}

// Process a small chunk of work for a job
// Called repeatedly by the frontend poll to make incremental progress
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const jobId = params.id;
  
  try {
    const job = await getSearchJob(jobId);
    if (!job) {
      return NextResponse.json({ ok: false, error: 'Job not found' }, { status: 404 });
    }
    
    if (job.status === 'completed') {
      return NextResponse.json({ ok: true, status: 'completed', hasMore: false });
    }
    
    if (job.status === 'failed' || job.status === 'cancelled') {
      return NextResponse.json({ ok: true, status: job.status, hasMore: false });
    }
    
    // Get current state from job
    const params_data = job.params as any;
    const currentResults = job.results || [];
    const requestedQuantity = job.requested_quantity;
    
    // If we already have enough, complete the job
    if (currentResults.length >= requestedQuantity) {
      await completeJob(jobId, currentResults);
      return NextResponse.json({ ok: true, status: 'completed', hasMore: false, found: currentResults.length });
    }
    
    // Parse job state (stored in progress_message as JSON or defaults)
    let state: any = {};
    try {
      if (job.progress_message && job.progress_message.startsWith('{')) {
        state = JSON.parse(job.progress_message);
      }
    } catch (e) {}
    
    // Resolve synthetic category IDs on first tick
    let categoryIds = state.resolvedCategoryIds;
    if (!categoryIds) {
      const rawCategoryIds = (params_data.categoryId || '').split(',').filter(Boolean);
      categoryIds = await resolveToRealCategoryIds(rawCategoryIds);
      console.log(`[Tick] Job ${jobId}: Resolved ${rawCategoryIds.length} input IDs to ${categoryIds.length} real CJ IDs`);
    }
    
    const currentCategoryIndex = state.categoryIndex || 0;
    const currentPage = state.page || 1;
    const seenPids = new Set<string>(state.seenPids || []);
    const profitMargin = params_data.profitMargin || 8;
    const minPrice = params_data.minPrice || 0;
    const maxPrice = params_data.maxPrice || 1000;
    
    if (currentCategoryIndex >= categoryIds.length) {
      // No more categories to search
      await completeJob(jobId, currentResults);
      return NextResponse.json({ ok: true, status: 'completed', hasMore: false, found: currentResults.length });
    }
    
    const categoryId = categoryIds[currentCategoryIndex];
    
    // Get access token
    const token = await getAccessToken();
    if (!token) {
      await failJob(jobId, 'Failed to get CJ access token');
      return NextResponse.json({ ok: false, error: 'CJ authentication failed' }, { status: 500 });
    }
    
    // Fetch one page of products (max 20 items)
    const listUrl = `${CJ_API_BASE}/product/list?pageNum=${currentPage}&pageSize=20&categoryId=${categoryId}`;
    console.log(`[Tick] Job ${jobId}: Fetching page ${currentPage} for category ${categoryId}`);
    
    let pageProducts: any[] = [];
    try {
      const res = await fetch(listUrl, {
        headers: { 'CJ-Access-Token': token },
        signal: AbortSignal.timeout(25000), // 25s timeout for this request
      });
      const data = await res.json();
      
      if (data.result && data.data && Array.isArray(data.data.list)) {
        pageProducts = data.data.list;
      }
    } catch (e: any) {
      console.error(`[Tick] Job ${jobId}: Failed to fetch page: ${e.message}`);
      // Don't fail the job, just try again next tick
      return NextResponse.json({ ok: true, status: 'running', hasMore: true, found: currentResults.length });
    }
    
    // Process products from this page
    const newProducts: any[] = [];
    for (const p of pageProducts) {
      try {
        if (seenPids.has(p.pid)) continue;
        seenPids.add(p.pid);
        
        // Get sell price from CJ
        const sellPrice = parseFloat(p.sellPrice || p.productSku?.[0]?.sellPrice || '0');
        if (sellPrice < minPrice || sellPrice > maxPrice) continue;
        
        // Calculate final price with profit margin
        const shippingEstimate = sellPrice <= 10 ? 4.99 : sellPrice <= 20 ? 6.99 : 8.99;
        const finalPrice = (sellPrice + shippingEstimate) * (1 + profitMargin / 100);
        
        // Extract main image
        const mainImage = p.productImage || p.productImageSet?.[0] || '';
        
        // Build PricedProduct-compatible variant objects
        const rawVariants = Array.isArray(p.productSku) ? p.productSku : [];
        const processedVariants = rawVariants.slice(0, 20).map((v: any) => {
          const varPrice = parseFloat(v.sellPrice || '0') || 0;
          const varStock = parseInt(v.variantStock || v.stock || '0', 10) || 0;
          return {
            variantId: v.vid || v.variantId || '',
            variantSku: v.variantSku || v.vid || '',
            variantPriceUSD: varPrice,
            shippingAvailable: varStock > 0, // Only available if in stock
            shippingPriceUSD: shippingEstimate,
            shippingPriceSAR: shippingEstimate * 3.75,
            deliveryDays: '7-12',
            sellPriceSAR: (varPrice + shippingEstimate) * (1 + profitMargin / 100) * 3.75,
            totalCostSAR: (varPrice + shippingEstimate) * 3.75,
            profitSAR: varPrice * (profitMargin / 100) * 3.75,
            stock: varStock,
            cjStock: varStock,
            variantName: (v.variantNameEn || v.variantName || '').slice(0, 100),
            variantImage: v.variantImage || mainImage || '',
          };
        });
        
        // Build images array
        const images: string[] = [];
        if (mainImage) images.push(mainImage);
        if (p.productImageSet && Array.isArray(p.productImageSet)) {
          for (const img of p.productImageSet.slice(0, 5)) {
            if (img && !images.includes(img)) images.push(img);
          }
        }
        
        // Calculate total stock safely
        const productStock = p.productStock ?? p.stock ?? 0;
        const variantStockSum = rawVariants.length > 0 
          ? rawVariants.reduce((sum: number, v: any) => sum + (parseInt(v.variantStock || v.stock || '0', 10) || 0), 0)
          : 0;
        const totalStock = productStock || variantStockSum || 0;
        
        // Count variants with stock
        const availableVariants = processedVariants.filter((v: any) => v.shippingAvailable);
        
        // Build PricedProduct object matching frontend type
        newProducts.push({
          pid: p.pid,
          cjSku: rawVariants[0]?.variantSku || p.pid || '',
          name: (p.productNameEn || p.productName || 'Unknown').slice(0, 200),
          images,
          minPriceSAR: finalPrice * 3.75,
          maxPriceSAR: finalPrice * 3.75,
          avgPriceSAR: finalPrice * 3.75,
          stock: totalStock,
          listedNum: p.listedNum || 0,
          variants: processedVariants,
          successfulVariants: availableVariants.length,
          totalVariants: rawVariants.length,
          categoryName: (p.categoryName || '').slice(0, 100),
          rating: calculateEstimatedRating(p.listedNum || 0),
          description: (p.description || p.productDescEn || '').slice(0, 500),
        });
        
        if (currentResults.length + newProducts.length >= requestedQuantity) break;
      } catch (productError: any) {
        console.error(`[Tick] Error processing product ${p?.pid}:`, productError.message);
        // Skip this product and continue with others
      }
    }
    
    // Merge new products with existing results
    const updatedResults = [...currentResults, ...newProducts];
    
    // Calculate next state
    let nextCategoryIndex = currentCategoryIndex;
    let nextPage = currentPage + 1;
    
    // If no products on this page, move to next category
    if (pageProducts.length === 0) {
      nextCategoryIndex++;
      nextPage = 1;
    }
    
    // Check if we're done
    const hasMore = nextCategoryIndex < categoryIds.length && updatedResults.length < requestedQuantity;
    
    // Save state (include resolvedCategoryIds so we don't resolve again)
    const newState = {
      categoryIndex: nextCategoryIndex,
      page: nextPage,
      seenPids: Array.from(seenPids).slice(-500), // Keep last 500 to prevent state bloat
      resolvedCategoryIds: categoryIds, // Persist resolved IDs
    };
    
    const progressMessage = hasMore ? JSON.stringify(newState) : `Found ${updatedResults.length} products`;
    
    if (hasMore) {
      await updateJobProgress(jobId, updatedResults.length, 0, progressMessage, updatedResults);
    } else {
      await completeJob(jobId, updatedResults);
    }
    
    console.log(`[Tick] Job ${jobId}: Found ${updatedResults.length}/${requestedQuantity}, hasMore=${hasMore}`);
    
    return NextResponse.json({
      ok: true,
      status: hasMore ? 'running' : 'completed',
      hasMore,
      found: updatedResults.length,
    });
    
  } catch (e: any) {
    console.error(`[Tick] Job ${jobId} error:`, e.message);
    await failJob(jobId, e.message || 'Unknown error');
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

function calculateEstimatedRating(listedNum: number): number {
  if (listedNum >= 2000) return 4.8;
  if (listedNum >= 1000) return 4.7;
  if (listedNum >= 500) return 4.5;
  if (listedNum >= 200) return 4.3;
  if (listedNum >= 100) return 4.2;
  if (listedNum >= 50) return 4.0;
  if (listedNum >= 20) return 3.9;
  return 3.8;
}
