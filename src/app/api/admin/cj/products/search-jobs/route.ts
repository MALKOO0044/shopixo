import { NextRequest, NextResponse } from 'next/server';
import { createSearchJob, startJob, updateJobProgress, completeJob, failJob, getSearchJob, SearchJobParams } from '@/lib/db/search-jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      keywords,
      categoryId,
      categoryName,
      minPrice,
      maxPrice,
      minStock,
      minRating,
      popularity,
      sizes,
      features,
      quantity,
      profitMargin,
      freeShippingOnly,
    } = body;

    const params: SearchJobParams = {
      keywords,
      categoryId,
      categoryName,
      minPrice: minPrice || 0,
      maxPrice: maxPrice || 1000,
      minStock: minStock || 0,
      minRating: minRating || 0,
      popularity,
      sizes: sizes || [],
      features: features || [],
      profitMargin: profitMargin || 8,
      freeShippingOnly: freeShippingOnly || false,
    };

    const requestedQuantity = Math.max(1, Math.min(5000, Number(quantity) || 50));

    const job = await createSearchJob(params, requestedQuantity);
    if (!job) {
      return NextResponse.json(
        { ok: false, error: 'Job system not available. Please run the cj_search_jobs migration in Supabase.', fallbackToDirectSearch: true },
        { status: 503 }
      );
    }

    console.log(`[SearchJobs] Created job ${job.id} for ${requestedQuantity} products`);

    runSearchJobInBackground(job.id, params, requestedQuantity);

    return NextResponse.json({
      ok: true,
      jobId: job.id,
      message: `Search job started. Looking for ${requestedQuantity} products...`,
    });
  } catch (e: any) {
    console.error('[SearchJobs] Error creating job:', e?.message);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Failed to create search job' },
      { status: 500 }
    );
  }
}

async function runSearchJobInBackground(jobId: string, params: SearchJobParams, quantity: number) {
  try {
    await startJob(jobId);
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : 'http://localhost:5000';
    
    const searchParams = new URLSearchParams();
    if (params.keywords) searchParams.set('keywords', params.keywords);
    if (params.categoryId) searchParams.set('categoryId', params.categoryId);
    if (params.minPrice) searchParams.set('minPrice', String(params.minPrice));
    if (params.maxPrice) searchParams.set('maxPrice', String(params.maxPrice));
    if (params.minStock) searchParams.set('minStock', String(params.minStock));
    if (params.minRating) searchParams.set('minRating', String(params.minRating));
    if (params.popularity) searchParams.set('popularity', params.popularity);
    if (params.sizes?.length) searchParams.set('sizes', params.sizes.join(','));
    if (params.features?.length) searchParams.set('features', params.features.join(','));
    if (params.profitMargin) searchParams.set('profitMargin', String(params.profitMargin));
    if (params.freeShippingOnly) searchParams.set('freeShippingOnly', 'true');
    searchParams.set('quantity', String(quantity));
    searchParams.set('jobId', jobId);

    const url = `${baseUrl}/api/admin/cj/products/search-and-price?${searchParams.toString()}`;
    
    console.log(`[SearchJobs] Starting background search for job ${jobId}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Search API failed: ${response.status} ${text}`);
    }

    const result = await response.json();
    
    if (result.ok && result.products) {
      await completeJob(jobId, result.products);
      console.log(`[SearchJobs] Job ${jobId} completed with ${result.products.length} products`);
    } else {
      await failJob(jobId, result.error || 'Search returned no products');
    }
  } catch (e: any) {
    console.error(`[SearchJobs] Job ${jobId} failed:`, e?.message);
    await failJob(jobId, e?.message || 'Unknown error');
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json(
      { ok: false, error: 'jobId is required' },
      { status: 400 }
    );
  }

  const job = await getSearchJob(jobId);
  if (!job) {
    return NextResponse.json(
      { ok: false, error: 'Job not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    job: {
      id: job.id,
      status: job.status,
      requested_quantity: job.requested_quantity,
      found_count: job.found_count,
      processed_count: job.processed_count,
      progress_message: job.progress_message,
      error_message: job.error_message,
      created_at: job.created_at,
      started_at: job.started_at,
      finished_at: job.finished_at,
      results: job.status === 'completed' ? job.results : undefined,
    },
  });
}
