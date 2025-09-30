import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { queryProductByPidOrKeyword, mapCjItemToProductLike, type CjProductLike } from '@/lib/cj/v2';
import { slugify } from '@/lib/utils/slug';
import { ensureAdmin } from '@/lib/auth/admin-guard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function ensureUniqueSlug(admin: any, base: string): Promise<string> {
  const s = slugify(base);
  let candidate = s;
  for (let i = 2; i <= 50; i++) {
    const { data } = await admin
      .from('products')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${s}-${i}`;
  }
  return `${s}-${Date.now()}`;
}

export async function POST(req: Request) {
  try {
    const guard = await ensureAdmin();
    if (!guard.ok) return NextResponse.json({ ok: false, version: 'import-v2', error: guard.reason }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 });

    const body = await req.json();
    const pid: string | undefined = body?.pid || undefined;
    const itemsIn: CjProductLike[] | undefined = body?.items || undefined;

    let items: CjProductLike[] = [];
    if (Array.isArray(itemsIn) && itemsIn.length > 0) {
      items = itemsIn;
    } else if (pid) {
      const raw = await queryProductByPidOrKeyword({ pid });
      const listRaw = Array.isArray(raw?.data?.content)
        ? raw.data.content
        : Array.isArray(raw?.content)
          ? raw.content
          : Array.isArray(raw?.data)
            ? raw.data
            : Array.isArray(raw)
              ? raw
              : [];
      items = (listRaw as any[]).map((it) => mapCjItemToProductLike(it)).filter(Boolean) as CjProductLike[];
      if (items.length === 0) return NextResponse.json({ ok: false, error: 'No CJ products found for pid' }, { status: 404 });
    } else {
      return NextResponse.json({ ok: false, error: 'Provide pid or items' }, { status: 400 });
    }

    const results: any[] = [];

    async function productVariantsTableExists(admin: any): Promise<boolean> {
      try {
        const probe = await admin.from('product_variants').select('product_id').limit(1);
        // @ts-ignore
        if (probe.error) return false; return true;
      } catch { return false; }
    }

    const hasVariantsTable = await productVariantsTableExists(supabase);

    for (const cj of items) {
      try {
        // If product with same cj_product_id exists, we will update it; otherwise insert.
        const { data: existing } = await supabase
          .from('products')
          .select('id, slug')
          .eq('cj_product_id', cj.productId)
          .maybeSingle();

        const baseSlug = await ensureUniqueSlug(supabase, cj.name);
        const priceCandidates = (cj.variants || []).map((v) => (typeof v.price === 'number' ? v.price : NaN)).filter((n) => !isNaN(n));
        const defaultPrice = priceCandidates.length > 0 ? Math.min(...priceCandidates) : 0;
        const totalStock = (cj.variants || []).reduce((acc, v) => acc + (typeof v.stock === 'number' ? v.stock : 0), 0);

        let productPayload: any = {
          title: cj.name,
          slug: existing?.slug || baseSlug,
          description: '',
          price: defaultPrice,
          images: cj.images || [],
          category: 'Women',
          stock: totalStock,
          video_url: cj.videoUrl || null,
          processing_time_hours: null,
          delivery_time_hours: cj.deliveryTimeHours ?? null,
          origin_area: cj.originArea ?? null,
          origin_country_code: cj.originCountryCode ?? null,
          free_shipping: true,
          inventory_shipping_fee: 0,
          last_mile_fee: 0,
          cj_product_id: cj.productId,
          shipping_from: cj.originArea ?? null,
          is_active: true,
        };

        // Omit is_active if column missing in this environment (supabase schema cache not having it)
        try {
          const probeActive = await supabase.from('products').select('is_active').limit(1);
          if (probeActive.error) {
            const { is_active, ...rest } = productPayload;
            productPayload = rest;
          }
        } catch {
          const { is_active, ...rest } = productPayload;
          productPayload = rest;
        }

        let productId: number;
        if (existing?.id) {
          const { data: upd, error: upErr } = await supabase
            .from('products')
            .update(productPayload)
            .eq('id', existing.id)
            .select('id')
            .single();
          if (upErr || !upd) throw upErr || new Error('Failed to update product');
          productId = upd.id as number;

          // Clear old variants
          await supabase.from('product_variants').delete().eq('product_id', productId);
        } else {
          const { data: ins, error: insErr } = await supabase
            .from('products')
            .insert(productPayload)
            .select('id')
            .single();
          if (insErr || !ins) throw insErr || new Error('Failed to insert product');
          productId = ins.id as number;
        }

        // Insert variants if table exists
        if (hasVariantsTable) {
          const variantsRows = (cj.variants || [])
            .filter((v) => v && (v.size || v.cjSku))
            .map((v) => ({
              product_id: productId,
              option_name: 'Size',
              option_value: v.size || '-',
              cj_sku: v.cjSku || null,
              price: typeof v.price === 'number' ? v.price : null,
              stock: typeof v.stock === 'number' ? v.stock : 0,
            }));
          if (variantsRows.length > 0) {
            const { error: vErr } = await supabase
              .from('product_variants')
              .insert(variantsRows);
            if (vErr) throw vErr;
          }
        }

        // Best-effort: recompute product stock using trigger or RPC (optional)
        try {
          await supabase.rpc('recompute_product_stock', { product_id_in: productId });
        } catch {}

        results.push({ ok: true, productId, title: cj.name });
      } catch (e: any) {
        results.push({ ok: false, error: e?.message || String(e), title: cj?.name });
      }
    }

    return NextResponse.json({ ok: true, version: 'import-v2', results }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, version: 'import-v2', error: e?.message || 'CJ import failed' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
