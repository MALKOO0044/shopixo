import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { hasTable } from '@/lib/db-features';



export type JobKind = 'finder' | 'import' | 'sync' | 'scanner' | 'media' | 'discover';

export type JobStatus = 'pending' | 'running' | 'success' | 'error' | 'canceled';

export type JobItemStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped' | 'canceled';



type UpsertJobItemByPidInput = Partial<{

  status: JobItemStatus;

  step: string | null;

  result: any;

  error_text: string | null;

}>;



type UpsertJobItemsByPidBulkInput = {

  cj_product_id: string;

  status?: JobItemStatus;

  step?: string | null;

  result?: any;

  error_text?: string | null;

};



function getAdmin(): SupabaseClient | null {

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key);

}



async function ensureJobsTables(): Promise<boolean> {

  const hasJobs = await hasTable('admin_jobs');

  if (!hasJobs) return false;

  const hasItems = await hasTable('admin_job_items');

  return hasItems;

}



export async function patchJob(id: number, patch: Partial<{ params: any; totals: any; status: JobStatus; started_at: string; finished_at: string; error_text: string }>): Promise<boolean> {

  const db = getAdmin();

  if (!db) return false;

  const { error } = await db

    .from('admin_jobs')

    .update(patch as any)

    .eq('id', id);

  return !error;

}



export async function createJob(kind: JobKind, params?: any): Promise<{ id: number } | null> {

  const db = getAdmin();

  if (!db) return null;

  const { data, error } = await db

    .from('admin_jobs')

    .insert({ kind, status: 'pending', params: params || null })

    .select('id')

    .single();

  if (error || !data) return null;

  return { id: data.id as number };

}



export async function startJob(id: number): Promise<boolean> {

  const db = getAdmin();

  if (!db) return false;

  const { error } = await db

    .from('admin_jobs')

    .update({ status: 'running', started_at: new Date().toISOString() })

    .eq('id', id);

  return !error;

}



export async function finishJob(id: number, status: Exclude<JobStatus, 'pending' | 'running'>, totals?: any, errorText?: string): Promise<boolean> {

  const db = getAdmin();

  if (!db) return false;

  const { error } = await db

    .from('admin_jobs')

    .update({ status, finished_at: new Date().toISOString(), totals: totals || null, error_text: errorText || null })

    .eq('id', id);

  return !error;

}



export async function addJobItem(jobId: number, input: {

  status?: JobItemStatus;

  step?: string | null;

  cj_product_id?: string | null;

  cj_sku?: string | null;

  result?: any;

  error_text?: string | null;

}): Promise<{ id: number } | null> {

  const db = getAdmin();

  if (!db) return null;

  const row = {

    job_id: jobId,

    status: input.status || 'pending',

    step: input.step || null,

    cj_product_id: input.cj_product_id || null,

    cj_sku: input.cj_sku || null,

    result: input.result || null,

    error_text: input.error_text || null,

  };

  const { data, error } = await db

    .from('admin_job_items')

    .insert(row)

    .select('id')

    .single();

  if (error || !data) return null;

  return { id: data.id as number };

}



export async function updateJobItem(id: number, patch: Partial<{ status: JobItemStatus; step: string | null; result: any; error_text: string | null; started_at: string; finished_at: string }>): Promise<boolean> {

  const db = getAdmin();

  if (!db) return false;

  const { error } = await db

    .from('admin_job_items')

    .update(patch as any)

    .eq('id', id);

  return !error;

}



export async function cancelJob(id: number): Promise<boolean> {

  const db = getAdmin();

  if (!db) return false;

  const { data, error } = await db

    .from('admin_jobs')

    .update({ status: 'canceled', finished_at: new Date().toISOString() })

    .eq('id', id)

    .in('status', ['pending', 'running'])

    .select('id')

    .maybeSingle();

  return !error && Boolean((data as any)?.id);

}



export async function getJob(id: number): Promise<any | null> {

  const db = getAdmin();

  if (!db) return null;

  const { data: job } = await db.from('admin_jobs').select('*').eq('id', id).maybeSingle();

  if (!job) return null;

  const { data: items } = await db.from('admin_job_items').select('*').eq('job_id', id).order('id', { ascending: true });

  return { job, items: items || [] };

}



export async function getJobMeta(id: number): Promise<any | null> {

  const db = getAdmin();

  if (!db) return null;

  const { data: job } = await db.from('admin_jobs').select('*').eq('id', id).maybeSingle();

  return job || null;

}



export async function listJobs(limit = 50): Promise<{ jobs: any[]; tablesMissing?: boolean }> {

  const db = getAdmin();

  if (!db) return { jobs: [], tablesMissing: true };

  const tablesExist = await ensureJobsTables();

  if (!tablesExist) return { jobs: [], tablesMissing: true };

  const { data } = await db

    .from('admin_jobs')

    .select('id, created_at, kind, status, started_at, finished_at, totals, error_text')

    .order('created_at', { ascending: false })

    .limit(limit);

  return { jobs: data || [] };

}



function buildUpsertJobItemByPidRow(jobId: number, cjProductId: string, input: UpsertJobItemByPidInput): Record<string, any> {

  return {

    job_id: jobId,

    cj_product_id: cjProductId,

    status: input.status || 'pending',

    step: typeof input.step === 'undefined' ? null : input.step,

    result: typeof input.result === 'undefined' ? null : input.result,

    error_text: typeof input.error_text === 'undefined' ? null : input.error_text,

  };

}



function isMissingOnConflictConstraintError(error: any): boolean {

  const message = String(error?.message || '').toLowerCase();

  const details = String(error?.details || '').toLowerCase();

  return (

    message.includes('there is no unique or exclusion constraint matching the on conflict specification')

    || details.includes('there is no unique or exclusion constraint matching the on conflict specification')

  );

}



async function upsertJobItemByPidLegacy(

  db: SupabaseClient,

  jobId: number,

  cjProductId: string,

  input: UpsertJobItemByPidInput,

): Promise<{ id: number } | null> {

  const { data: exist } = await db

    .from('admin_job_items')

    .select('id')

    .eq('job_id', jobId)

    .eq('cj_product_id', cjProductId)

    .maybeSingle();



  if (exist?.id) {

    const { error } = await db

      .from('admin_job_items')

      .update({

        status: input.status || 'pending',

        step: typeof input.step === 'undefined' ? null : input.step,

        result: typeof input.result === 'undefined' ? null : input.result,

        error_text: typeof input.error_text === 'undefined' ? null : input.error_text,

      } as any)

      .eq('id', exist.id);

    if (error) return null;

    return { id: exist.id as number };

  }



  return await addJobItem(jobId, {

    status: input.status || 'pending',

    step: typeof input.step === 'undefined' ? null : input.step,

    cj_product_id: cjProductId,

    cj_sku: undefined,

    result: typeof input.result === 'undefined' ? null : input.result,

    error_text: typeof input.error_text === 'undefined' ? null : input.error_text,

  });

}



export async function upsertJobItemByPid(jobId: number, cj_product_id: string, input: UpsertJobItemByPidInput): Promise<{ id: number } | null> {

  const db = getAdmin();

  if (!db) return null;



  const normalizedPid = String(cj_product_id || '').trim();

  if (!normalizedPid) return null;



  const fastRow = buildUpsertJobItemByPidRow(jobId, normalizedPid, input);

  const fastResult = await db

    .from('admin_job_items')

    .upsert(fastRow, { onConflict: 'job_id,cj_product_id' })

    .select('id')

    .maybeSingle();



  if (!fastResult.error && fastResult.data?.id) {

    return { id: fastResult.data.id as number };

  }



  if (fastResult.error && !isMissingOnConflictConstraintError(fastResult.error)) {

    return null;

  }



  return await upsertJobItemByPidLegacy(db, jobId, normalizedPid, input);

}



export async function upsertJobItemsByPidBulk(

  jobId: number,

  items: UpsertJobItemsByPidBulkInput[],

  options?: { chunkSize?: number }

): Promise<{ ok: boolean; upserted: number; failedPids: string[] }> {

  const db = getAdmin();

  if (!db) return { ok: false, upserted: 0, failedPids: [] };



  const deduped = new Map<string, UpsertJobItemsByPidBulkInput>();

  for (const item of items || []) {

    const pid = String(item?.cj_product_id || '').trim();

    if (!pid) continue;

    deduped.set(pid, {

      cj_product_id: pid,

      status: item?.status,

      step: item?.step,

      result: item?.result,

      error_text: item?.error_text,

    });

  }



  const uniqueItems = Array.from(deduped.values());

  if (uniqueItems.length === 0) {

    return { ok: true, upserted: 0, failedPids: [] };

  }



  const chunkSize = Math.max(1, Math.min(250, Number(options?.chunkSize || 120)));

  const failedPids: string[] = [];

  let upserted = 0;



  for (let i = 0; i < uniqueItems.length; i += chunkSize) {

    const chunk = uniqueItems.slice(i, i + chunkSize);

    const rows = chunk.map((item) => buildUpsertJobItemByPidRow(jobId, item.cj_product_id, {

      status: item.status,

      step: item.step,

      result: item.result,

      error_text: item.error_text,

    }));



    const upsertRes = await db

      .from('admin_job_items')

      .upsert(rows, { onConflict: 'job_id,cj_product_id' });



    if (!upsertRes.error) {

      upserted += chunk.length;

      continue;

    }



    if (!isMissingOnConflictConstraintError(upsertRes.error)) {

      failedPids.push(...chunk.map((item) => item.cj_product_id));

      return { ok: false, upserted, failedPids };

    }



    // Legacy fallback for databases that do not yet have a unique key on (job_id, cj_product_id).

    for (const item of chunk) {

      const saved = await upsertJobItemByPidLegacy(db, jobId, item.cj_product_id, {

        status: item.status,

        step: item.step,

        result: item.result,

        error_text: item.error_text,

      });

      if (!saved?.id) {

        failedPids.push(item.cj_product_id);

      } else {

        upserted += 1;

      }

    }

  }



  if (failedPids.length > 0) {

    return { ok: false, upserted, failedPids };

  }



  return { ok: true, upserted, failedPids: [] };

}



export async function listJobsByKindsAndStatuses(

  kinds: string[],

  statuses: JobStatus[],

  options?: { ascending?: boolean; limit?: number }

): Promise<any[]> {

  const db = getAdmin();

  if (!db) return [];



  const safeKinds = Array.from(new Set((kinds || []).map((entry) => String(entry || '').trim()).filter(Boolean)));

  const safeStatuses = Array.from(

    new Set(

      (statuses || []).map((entry) => String(entry || '').trim().toLowerCase()).filter((entry) =>

        entry === 'pending' || entry === 'running' || entry === 'success' || entry === 'error' || entry === 'canceled'

      )

    )

  ) as JobStatus[];



  if (safeKinds.length === 0 || safeStatuses.length === 0) return [];



  const ascending = options?.ascending !== false;

  const limit = Math.max(1, Math.min(2000, Number(options?.limit || 500)));

  const { data, error } = await db

    .from('admin_jobs')

    .select('*')

    .in('kind', safeKinds as any)

    .in('status', safeStatuses as any)

    .order('created_at', { ascending })

    .order('id', { ascending })

    .limit(limit);



  if (error || !Array.isArray(data)) return [];

  return data;

}

