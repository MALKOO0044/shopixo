import { NextRequest, NextResponse } from 'next/server';
import { getSearchJob, updateJobProgress, completeJob, failJob } from '@/lib/db/search-jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Pro allows up to 60s

const CJ_API_BASE = process.env.CJ_API_BASE || 'https://developers.cjdropshipping.com/api2.0/v1';
const CJ_API_KEY = process.env.CJ_API_KEY || '';

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
    
    const categoryIds = (params_data.categoryId || '').split(',').filter(Boolean);
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
    
    // Fetch one page of products (max 20 items)
    const listUrl = `${CJ_API_BASE}/product/list?pageNum=${currentPage}&pageSize=20&categoryId=${categoryId}`;
    console.log(`[Tick] Job ${jobId}: Fetching page ${currentPage} for category ${categoryId}`);
    
    let pageProducts: any[] = [];
    try {
      const res = await fetch(listUrl, {
        headers: { 'CJ-Access-Token': CJ_API_KEY },
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
      
      newProducts.push({
        pid: p.pid,
        productNameEn: p.productNameEn || p.productName || 'Unknown',
        sellPrice: sellPrice.toFixed(2),
        finalPrice: finalPrice.toFixed(2),
        shippingCost: shippingEstimate.toFixed(2),
        productImage: mainImage,
        categoryName: p.categoryName || '',
        listedNum: p.listedNum || 0,
        estimatedRating: calculateEstimatedRating(p.listedNum || 0),
        variants: p.productSku || [],
      });
      
      if (currentResults.length + newProducts.length >= requestedQuantity) break;
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
    
    // Save state
    const newState = {
      categoryIndex: nextCategoryIndex,
      page: nextPage,
      seenPids: Array.from(seenPids).slice(-500), // Keep last 500 to prevent state bloat
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
