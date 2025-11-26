import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const SAFETY_BUFFER = 5;
const LOW_STOCK_THRESHOLD = 10;

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function runDailySync(db: ReturnType<typeof getAdmin>) {
  if (!db) return { synced: 0, changes: 0, autoHidden: 0 };

  const { data: products } = await db
    .from("products")
    .select("id, cj_product_id, price, stock, is_active")
    .not("cj_product_id", "is", null);

  if (!products || products.length === 0) {
    return { synced: 0, changes: 0, autoHidden: 0 };
  }

  let changesDetected = 0;
  let autoHidden = 0;

  for (const product of products) {
    if (!product.cj_product_id) continue;

    const displayStock = Math.max(0, (product.stock || 0) - SAFETY_BUFFER);
    
    if (displayStock <= 0 && product.is_active) {
      await db.from("products").update({ 
        is_active: false, 
        updated_at: new Date().toISOString() 
      }).eq("id", product.id);
      
      await db.from("daily_sync_changes").insert({
        product_id: product.id,
        cj_product_id: product.cj_product_id,
        change_type: "stock",
        old_value: String(product.stock || 0),
        new_value: "0",
        status: "auto_applied",
        detected_at: new Date().toISOString(),
      });
      
      autoHidden++;
      changesDetected++;
    }
  }

  return { synced: products.length, changes: changesDetected, autoHidden };
}

async function runInventoryCheck(db: ReturnType<typeof getAdmin>) {
  if (!db) return { checked: 0, lowStock: 0, outOfStock: 0 };

  const { data: allProducts } = await db
    .from("products")
    .select("id, title, stock, is_active")
    .eq("is_active", true);

  const products = allProducts || [];
  const lowStockProducts = products.filter(p => (p.stock || 0) <= LOW_STOCK_THRESHOLD && (p.stock || 0) > 0);
  const outOfStockProducts = products.filter(p => (p.stock || 0) === 0);

  if (lowStockProducts.length > 0 || outOfStockProducts.length > 0) {
    try {
      await db.from("notifications").insert({
        type: "stock_alert",
        title: `Stock Alert: ${lowStockProducts.length} low, ${outOfStockProducts.length} out`,
        body: `${lowStockProducts.length} products below ${LOW_STOCK_THRESHOLD} units. ${outOfStockProducts.length} products out of stock.`,
        meta: { 
          lowStock: lowStockProducts.length, 
          outOfStock: outOfStockProducts.length,
          timestamp: new Date().toISOString()
        },
        status: "unread",
      });
    } catch {}
  }

  return { 
    checked: products.length, 
    lowStock: lowStockProducts.length,
    outOfStock: outOfStockProducts.length
  };
}

async function checkCronAuth(req: NextRequest): Promise<{ ok: boolean; reason?: string }> {
  const url = new URL(req.url);
  const cronSecret = process.env.CRON_SECRET || '';
  const headerSecret = req.headers.get('x-cron-secret') || url.searchParams.get('secret') || '';

  if (cronSecret && headerSecret && headerSecret === cronSecret) {
    return { ok: true };
  }

  const { cookies } = await import('next/headers');
  const { createRouteHandlerClient } = await import('@supabase/auth-helpers-nextjs');
  
  try {
    const supabaseAuth = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    
    if (!user) {
      return { ok: false, reason: 'Authentication required' };
    }

    const email = String(user.email || '').toLowerCase();
    const allowEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const allowDomains = (process.env.ADMIN_EMAIL_DOMAINS || '')
      .split(',')
      .map((s) => s.trim().toLowerCase().replace(/^@/, ''))
      .filter(Boolean);

    if (allowEmails.length === 0 && allowDomains.length === 0) {
      if (process.env.NODE_ENV === 'production') {
        return { ok: false, reason: 'Admin access not configured' };
      }
      return { ok: true };
    }

    const emailAllowed = allowEmails.includes(email);
    const domainAllowed = email.includes('@') && allowDomains.includes(email.split('@')[1]);

    if (emailAllowed || domainAllowed) {
      return { ok: true };
    }

    return { ok: false, reason: 'Not authorized' };
  } catch (e: any) {
    return { ok: false, reason: e?.message || 'Auth error' };
  }
}

export async function GET(req: NextRequest) {
  const db = getAdmin();
  if (!db) {
    return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
  }

  try {
    const authResult = await checkCronAuth(req);
    if (!authResult.ok) {
      return NextResponse.json({ ok: false, error: authResult.reason || 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);

    const jobType = url.searchParams.get("job") || "all";

    const results: Record<string, any> = {
      timestamp: new Date().toISOString(),
      jobs: [],
    };

    const { data: jobRecord } = await db
      .from("admin_jobs")
      .insert({
        kind: "scanner",
        status: "running",
        started_at: new Date().toISOString(),
        params: { jobType, source: "cron" },
      })
      .select("id")
      .single();

    const jobId = jobRecord?.id;

    try {
      if (jobType === "all" || jobType === "sync") {
        const syncResult = await runDailySync(db);
        results.jobs.push({ name: "daily_sync", ...syncResult });
      }

      if (jobType === "all" || jobType === "inventory") {
        const inventoryResult = await runInventoryCheck(db);
        results.jobs.push({ name: "inventory_check", ...inventoryResult });
      }

      if (jobId) {
        await db.from("admin_jobs").update({
          status: "success",
          finished_at: new Date().toISOString(),
          totals: results,
        }).eq("id", jobId);
      }

      return NextResponse.json({ ok: true, ...results });
    } catch (jobError: any) {
      if (jobId) {
        await db.from("admin_jobs").update({
          status: "error",
          finished_at: new Date().toISOString(),
          error_text: jobError?.message || "Job failed",
        }).eq("id", jobId);
      }
      throw jobError;
    }
  } catch (e: any) {
    console.error("Cron tick error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Cron job failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
