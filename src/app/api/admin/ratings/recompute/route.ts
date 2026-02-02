import { NextResponse } from 'next/server';
import { ensureAdmin } from '@/lib/auth/admin-guard';
import { createClient } from '@supabase/supabase-js';
import { computeRating } from '@/lib/rating/engine';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: Request) {
  try {
    const guard = await ensureAdmin();
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: guard.reason }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const productIds: number[] = Array.isArray(body?.productIds) ? body.productIds.filter((n: any) => Number.isFinite(n)).map((n: any) => Number(n)) : [];
    const limit: number = Math.max(1, Math.min(1000, Number(body?.limit || 200)));
    const recentDays: number | undefined = body?.recentDays != null ? Math.max(1, Math.min(365, Number(body.recentDays))) : undefined;

    let products: any[] = [];
    if (productIds.length > 0) {
      const { data, error } = await admin.from('products').select('id, images').in('id', productIds).limit(limit);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      products = data || [];
    } else if (recentDays) {
      const since = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await admin
        .from('products')
        .select('id, images, updated_at')
        .gte('updated_at', since)
        .order('updated_at', { ascending: false })
        .limit(limit);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      products = data || [];
    } else {
      const { data, error } = await admin
        .from('products')
        .select('id, images, updated_at')
        .order('updated_at', { ascending: false })
        .limit(limit);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      products = data || [];
    }

    let updated = 0;
    for (const p of products) {
      const images = Array.isArray(p.images) ? p.images : [];
      const rating = computeRating({ imageCount: images.length, priceScore: 0.5 });
      // Update product
      const { error: updErr } = await admin
        .from('products')
        .update({ displayed_rating: rating.displayedRating, rating_confidence: rating.confidence })
        .eq('id', p.id);
      if (!updErr) updated++;
      // Insert signal snapshot
      await admin.from('product_rating_signals').insert({
        product_id: p.id,
        image_count: images.length,
        price_score: 0.5,
        quality_penalty: null,
        computed_score: rating.displayedRating,
        confidence: rating.confidence,
      });
    }

    return NextResponse.json({ ok: true, updated, processed: products.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Recompute failed' }, { status: 500 });
  }
}
