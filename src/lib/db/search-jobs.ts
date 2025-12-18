import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('[SearchJobs] Missing Supabase credentials:', { url: !!url, key: !!key });
    return null;
  }
  if (!supabaseAdmin) {
    console.log('[SearchJobs] Creating Supabase admin client for:', url);
    supabaseAdmin = createClient(url, key);
  }
  return supabaseAdmin;
}

export interface SearchJobParams {
  keywords?: string;
  categoryId?: string;
  categoryName?: string;
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
  minRating?: number;
  popularity?: string;
  sizes?: string[];
  features?: string[];
  profitMargin?: number;
  freeShippingOnly?: boolean;
}

export interface SearchJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  params: SearchJobParams;
  requested_quantity: number;
  found_count: number;
  processed_count: number;
  progress_message: string | null;
  results: any[] | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  last_updated_at: string;
}

export async function createSearchJob(params: SearchJobParams, quantity: number): Promise<{ id: string } | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('[SearchJobs] No Supabase client available');
    return null;
  }

  console.log('[SearchJobs] Creating job with quantity:', quantity);
  
  const { data, error } = await supabase
    .from('cj_search_jobs')
    .insert({
      status: 'pending',
      params,
      requested_quantity: quantity,
      found_count: 0,
      processed_count: 0,
      progress_message: 'Initializing search...',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[SearchJobs] Failed to create job:', error.message, error.code, error.details);
    return null;
  }
  console.log('[SearchJobs] Job created successfully:', data.id);
  return data;
}

export async function getSearchJob(jobId: string): Promise<SearchJob | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('cj_search_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) {
    console.error('[SearchJobs] Failed to get job:', error.message);
    return null;
  }
  return data;
}

export async function updateJobProgress(
  jobId: string, 
  foundCount: number, 
  processedCount: number, 
  message: string,
  partialResults?: any[]
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  try {
    const updateData: any = {
      found_count: foundCount,
      processed_count: processedCount,
      progress_message: message,
      last_updated_at: new Date().toISOString(),
    };
    
    // Also save partial results if provided (for resumable jobs)
    if (partialResults !== undefined) {
      // Safely serialize to avoid circular refs
      updateData.results = JSON.parse(JSON.stringify(partialResults));
    }

    const { error } = await supabase
      .from('cj_search_jobs')
      .update(updateData)
      .eq('id', jobId);

    if (error) {
      console.error('[SearchJobs] Failed to update progress:', error.message);
      // If results are too large, try without them
      if (partialResults && (error.message.includes('payload') || error.message.includes('size'))) {
        delete updateData.results;
        await supabase.from('cj_search_jobs').update(updateData).eq('id', jobId);
      }
      return false;
    }
    return true;
  } catch (e: any) {
    console.error('[SearchJobs] Exception updating progress:', e.message);
    return false;
  }
}

export async function startJob(jobId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase
    .from('cj_search_jobs')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
      progress_message: 'Search started...',
      last_updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    console.error('[SearchJobs] Failed to start job:', error.message);
    return false;
  }
  return true;
}

export async function completeJob(jobId: string, results: any[]): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  try {
    // Ensure results are safe to store (handle any circular refs or huge objects)
    const safeResults = JSON.parse(JSON.stringify(results));
    
    const { error } = await supabase
      .from('cj_search_jobs')
      .update({
        status: 'completed',
        results: safeResults,
        found_count: safeResults.length,
        finished_at: new Date().toISOString(),
        progress_message: `Completed! Found ${safeResults.length} products.`,
        last_updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) {
      console.error('[SearchJobs] Failed to complete job:', error.message, error.code);
      // Try to complete without results if too large
      if (error.message.includes('payload') || error.message.includes('size')) {
        console.log('[SearchJobs] Attempting to complete without full results due to size');
        await supabase
          .from('cj_search_jobs')
          .update({
            status: 'completed',
            found_count: results.length,
            finished_at: new Date().toISOString(),
            progress_message: `Completed! Found ${results.length} products (results truncated).`,
            last_updated_at: new Date().toISOString(),
          })
          .eq('id', jobId);
      }
      return false;
    }
    return true;
  } catch (e: any) {
    console.error('[SearchJobs] Exception completing job:', e.message);
    return false;
  }
}

export async function failJob(jobId: string, errorMessage: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase
    .from('cj_search_jobs')
    .update({
      status: 'failed',
      error_message: errorMessage,
      finished_at: new Date().toISOString(),
      progress_message: `Failed: ${errorMessage}`,
      last_updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    console.error('[SearchJobs] Failed to mark job as failed:', error.message);
    return false;
  }
  return true;
}

export async function cancelJob(jobId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase
    .from('cj_search_jobs')
    .update({
      status: 'cancelled',
      finished_at: new Date().toISOString(),
      progress_message: 'Search cancelled by user.',
      last_updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    console.error('[SearchJobs] Failed to cancel job:', error.message);
    return false;
  }
  return true;
}

export async function appendResults(jobId: string, newProducts: any[]): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const job = await getSearchJob(jobId);
  if (!job) return false;

  const existingResults = job.results || [];
  const updatedResults = [...existingResults, ...newProducts];

  const { error } = await supabase
    .from('cj_search_jobs')
    .update({
      results: updatedResults,
      found_count: updatedResults.length,
      last_updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    console.error('[SearchJobs] Failed to append results:', error.message);
    return false;
  }
  return true;
}

export async function isJobTableConfigured(): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase.from('cj_search_jobs').select('id').limit(1);
  if (error && error.message.includes('does not exist')) {
    return false;
  }
  return true;
}
