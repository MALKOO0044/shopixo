import { NextRequest, NextResponse } from 'next/server';
import { createSearchJob, startJob, getSearchJob, SearchJobParams } from '@/lib/db/search-jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Pro limit

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

    // Mark job as running (the /tick endpoint will do the actual work)
    await startJob(job.id);

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
      // Return results for completed jobs, and partial results for stuck job recovery
      results: job.results || undefined,
    },
  });
}
