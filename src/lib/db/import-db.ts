import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('[Import DB] Missing Supabase credentials:', { url: !!url, key: !!key });
    return null;
  }
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(url, key);
  }
  return supabaseAdmin;
}

export function isImportDbConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function testImportDbConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return { ok: false, error: 'Supabase not configured' };
    }
    const { error } = await supabase.from('import_batches').select('id').limit(1);
    if (error) {
      if (error.message.includes('does not exist')) {
        return { ok: false, error: 'Import tables not found. Please run the database migration.' };
      }
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Connection failed' };
  }
}

export async function createImportBatch(data: {
  name: string;
  keywords: string;
  category: string;
  filters: any;
  productsFound: number;
}): Promise<{ id: number } | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data: batch, error } = await supabase
    .from('import_batches')
    .insert({
      name: data.name,
      keywords: data.keywords,
      category: data.category,
      filters: data.filters,
      status: 'active',
      products_found: data.productsFound,
      products_approved: 0,
      products_imported: 0,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[Import DB] Failed to create batch:', error.message);
    return null;
  }
  return batch;
}

export async function addProductToQueue(batchId: number, product: {
  productId: string;
  cjSku?: string;
  name: string;
  description?: string;
  category: string;
  images: string[];
  videoUrl?: string;
  variants: any[];
  avgPrice: number;
  supplierRating?: number;
  totalSales?: number;
  totalStock: number;
  processingDays?: number;
  deliveryDaysMin?: number;
  deliveryDaysMax?: number;
  qualityScore?: number;
}): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase
    .from('product_queue')
    .upsert({
      batch_id: batchId,
      cj_product_id: product.productId,
      cj_sku: product.cjSku || null,
      name_en: product.name,
      name_ar: null,
      description_en: product.description || null,
      description_ar: null,
      category: product.category,
      images: product.images,
      video_url: product.videoUrl || null,
      variants: product.variants,
      cj_price_usd: product.avgPrice,
      shipping_cost_usd: null,
      calculated_retail_sar: null,
      margin_applied: null,
      supplier_rating: product.supplierRating || 4.0,
      total_sales: product.totalSales || 0,
      stock_total: product.totalStock,
      processing_days: product.processingDays || 3,
      delivery_days_min: product.deliveryDaysMin || 7,
      delivery_days_max: product.deliveryDaysMax || 15,
      quality_score: product.qualityScore || 0.75,
      status: 'pending',
      admin_notes: null,
      reviewed_by: null,
      reviewed_at: null,
      shopixo_product_id: null,
      imported_at: null,
    }, {
      onConflict: 'cj_product_id',
    });

  if (error) {
    console.error('[Import DB] Failed to add product to queue:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      productId: product.productId
    });
    return false;
  }
  return true;
}

export async function logImportAction(batchId: number, action: string, status: string, details: any): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await supabase.from('import_logs').insert({
    batch_id: batchId,
    action,
    status,
    details,
  });
}

export async function getQueuedProducts(options: {
  status?: string;
  batchId?: number;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  let query = supabase.from('product_queue').select('*');

  if (options.status) {
    query = query.eq('status', options.status);
  }
  if (options.batchId) {
    query = query.eq('batch_id', options.batchId);
  }
  
  query = query.order('created_at', { ascending: false });
  
  if (options.limit) {
    query = query.limit(options.limit);
  }
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[Import DB] Failed to get queued products:', error.message);
    return [];
  }
  return data || [];
}

export async function updateProductStatus(productId: string, status: string, notes?: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase
    .from('product_queue')
    .update({
      status,
      admin_notes: notes || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('cj_product_id', productId);

  if (error) {
    console.error('[Import DB] Failed to update product status:', error.message);
    return false;
  }
  return true;
}

export async function getBatches(limit: number = 50): Promise<any[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('import_batches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Import DB] Failed to get batches:', error.message);
    return [];
  }
  return data || [];
}

export async function getQueueStats(): Promise<{ pending: number; approved: number; rejected: number; imported: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { pending: 0, approved: 0, rejected: 0, imported: 0 };

  const [pending, approved, rejected, imported] = await Promise.all([
    supabase.from('product_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('product_queue').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('product_queue').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabase.from('product_queue').select('id', { count: 'exact', head: true }).eq('status', 'imported'),
  ]);

  return {
    pending: pending.count || 0,
    approved: approved.count || 0,
    rejected: rejected.count || 0,
    imported: imported.count || 0,
  };
}
