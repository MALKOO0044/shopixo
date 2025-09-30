import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ensureAdmin } from '@/lib/auth/admin-guard';
import { queryProductByPidOrKeyword, mapCjItemToProductLike } from '@/lib/cj/v2';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function productVariantsTableExists(admin: any): Promise<boolean> {
  try {
    const probe = await admin.from('product_variants').select('product_id').limit(1);
    // @ts-ignore
    if (probe.error) return false; return true;
  } catch { return false; }
}

export async function GET(req: Request) {
  try {
    const guard = await ensureAdmin();
    if (!guard.ok) return NextResponse.json({ ok: false, version: 'cj-sync-v1', error: guard.reason }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 });

    const { searchParams } = new URL(req.url);
    const limit = Math.max(1, Math.min(50, Number(searchParams.get('limit') || '20')));
    const offset = Math.max(0, Number(searchParams.get('offset') || '0'));
    const idsCsv = searchParams.get('ids');
    const updatePrice = (searchParams.get('updatePrice') || 'false').toLowerCase() === 'true';

    const hasVariants = await productVariantsTableExists(supabase);

    let products: any[] = [];
    if (idsCsv) {
      const ids = idsCsv.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
      if (ids.length === 0) return NextResponse.json({ ok: false, version: 'cj-sync-v1', error: 'No valid ids provided' }, { status: 400 });
      const { data } = await supabase
        .from('products')
        .select('id, cj_product_id, slug, title, price')
        .in('id', ids)
        .is('cj_product_id', null, { negated: true });
      products = data || [];
    } else {
      const { data } = await supabase
        .from('products')
        .select('id, cj_product_id, slug, title, price')
        .not('cj_product_id', 'is', null)
        .order('id', { ascending: true })
        .range(offset, offset + limit - 1);
      products = data || [];
    }

    if (products.length === 0) {
      return NextResponse.json({ ok: true, version: 'cj-sync-v1', synced: 0, results: [] }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const results: any[] = [];

    for (const p of products) {
      try {
        const pid = String(p.cj_product_id);
        const raw = await queryProductByPidOrKeyword({ pid });
        const itemRaw = Array.isArray(raw?.data?.content)
          ? raw.data.content[0]
          : Array.isArray(raw?.content)
            ? raw.content[0]
            : (raw?.data || raw);
        const cj = mapCjItemToProductLike(itemRaw);
        if (!cj) throw new Error('CJ item map failed');

        // Update variants if table exists
        if (hasVariants) {
          const rows = (cj.variants || [])
            .filter((v) => v && (v.size || v.cjSku))
            .map((v) => ({
              product_id: p.id,
              option_name: 'Size',
              option_value: v.size || '-',
              cj_sku: v.cjSku || null,
              price: typeof v.price === 'number' ? v.price : null,
              stock: typeof v.stock === 'number' ? v.stock : 0,
            }));
          await supabase.from('product_variants').delete().eq('product_id', p.id);
          if (rows.length > 0) {
            const { error: vErr } = await supabase.from('product_variants').insert(rows);
            if (vErr) throw vErr;
          }
        }

        // Update product stock (and price optionally)
        let update: Record<string, any> = {};
        if (hasVariants) {
          const stockSum = (cj.variants || []).reduce((acc, v) => acc + (typeof v.stock === 'number' ? v.stock : 0), 0);
          update.stock = stockSum;
        }
        if (updatePrice) {
          const priceCandidates = (cj.variants || [])
            .map((v) => (typeof v.price === 'number' ? v.price : NaN))
            .filter((n) => !isNaN(n));
          const base = priceCandidates.length > 0 ? Math.min(...priceCandidates) : undefined;
          if (typeof base === 'number') update.price = base;
        }
        if (Object.keys(update).length > 0) {
          await supabase.from('products').update(update).eq('id', p.id);
        }

        // Recompute stock via RPC if present
        try { await supabase.rpc('recompute_product_stock', { product_id_in: p.id }); } catch {}

        results.push({ ok: true, productId: p.id, cjPid: pid, updated: Object.keys(update) });
      } catch (e: any) {
        results.push({ ok: false, productId: p?.id, error: e?.message || String(e) });
      }
    }

    return NextResponse.json({ ok: true, version: 'cj-sync-v1', synced: results.filter(r => r.ok).length, results }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, version: 'cj-sync-v1', error: e?.message || 'Sync failed' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
