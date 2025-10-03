import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ensureAdmin } from '@/lib/auth/admin-guard';
import { hasColumn } from '@/lib/db-features';
import { loggerForRequest } from '@/lib/log';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function doClear(_req: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 });
  }

  // Count products before
  const before = await supabase.from('products').select('id', { count: 'exact', head: true });
  const productsCount = before.count ?? 0;

  // 1) Clear cart_items to avoid FK restrictions when deleting products
  try { await supabase.from('cart_items').delete().neq('id', 0); } catch {}

  // 2) Determine which products are referenced by order_items (keep history)
  const { data: refs } = await supabase.from('order_items').select('product_id');
  const referenced = new Set<number>();
  for (const r of (refs || [])) {
    const id = (r as any)?.product_id;
    if (typeof id === 'number') referenced.add(id);
  }

  // 3) Fetch all product ids
  const { data: prods } = await supabase.from('products').select('id');
  const allIds = (prods || []).map((p: any) => p.id as number).filter((n: any) => typeof n === 'number');
  const toDelete = allIds.filter((id) => !referenced.has(id));
  const toDeactivate = allIds.filter((id) => referenced.has(id));

  // 4) Hard-delete unreferenced products
  let deleted = 0;
  if (toDelete.length > 0) {
    const { data: delRows } = await supabase
      .from('products')
      .delete()
      .in('id', toDelete)
      .select('id');
    deleted = delRows?.length ?? 0;
  }

  // 5) Soft-deactivate referenced products if column exists
  let deactivated = 0;
  try {
    const hasActive = await hasColumn('products', 'is_active');
    if (hasActive && toDeactivate.length > 0) {
      const { data: updRows } = await supabase
        .from('products')
        .update({ is_active: false, stock: 0 })
        .in('id', toDeactivate)
        .select('id');
      deactivated = updRows?.length ?? 0;
    }
  } catch {}

  return NextResponse.json({ ok: true, productsBefore: productsCount, deleted, deactivated, referencedCount: referenced.size });
}

export async function POST(req: Request) {
  const log = loggerForRequest(req);
  const guard = await ensureAdmin();
  if (!guard.ok) {
    const r = NextResponse.json({ ok: false, error: guard.reason }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    r.headers.set('x-request-id', log.requestId);
    return r;
  }
  const r = await doClear(req);
  r.headers.set('x-request-id', log.requestId);
  return r;
}

// Convenience GET with confirm=1 for quick manual triggering from browser
export async function GET(req: Request) {
  const log = loggerForRequest(req);
  const guard = await ensureAdmin();
  if (!guard.ok) {
    const r = NextResponse.json({ ok: false, error: guard.reason }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    r.headers.set('x-request-id', log.requestId);
    return r;
  }
  const url = new URL(req.url);
  const confirm = (url.searchParams.get('confirm') || '').toLowerCase();
  if (confirm !== '1' && confirm !== 'true' && confirm !== 'yes') {
    const r = NextResponse.json({ ok: false, error: 'Confirm with ?confirm=1' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    r.headers.set('x-request-id', log.requestId);
    return r;
  }
  const r = await doClear(req);
  r.headers.set('x-request-id', log.requestId);
  return r;
}
