import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/auth/admin-guard";
import { createClient } from "@supabase/supabase-js";
import { hasColumn, hasTable } from "@/lib/db-features";
import { computeRating } from "@/lib/rating/engine";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const guard = await ensureAdmin();
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: guard.reason }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const ids: number[] | undefined = Array.isArray(body?.productIds) ? body.productIds : undefined;
    const recentDays: number = Math.max(1, Math.min(90, Number(body?.recentDays || 7)));
    const limit: number = Math.max(1, Math.min(1000, Number(body?.limit || 200)));

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    const hasSignalsTable = await hasTable('product_rating_signals').catch(() => false);
    const hasDispCol = await hasColumn('products', 'displayed_rating').catch(() => false);
    const hasConfCol = await hasColumn('products', 'rating_confidence').catch(() => false);

    // Select target products
    let query = admin.from('products').select('id, images, stock, price, cj_product_id');
    if (ids && ids.length > 0) {
      query = query.in('id', ids);
    } else {
      const since = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('updated_at', since).limit(limit);
    }

    const { data: products, error } = await query;
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const results: Array<{ id: number; displayed: number; confidence: number }> = [];
    let failures = 0;

    // For per-product variant counts if variants table exists
    const hasVariantsTable = await hasTable('product_variants').catch(() => false);

    for (const p of products || []) {
      try {
        let variantCount = 0;
        if (hasVariantsTable) {
          const { count } = await admin
            .from('product_variants')
            .select('id', { count: 'exact', head: true })
            .eq('product_id', p.id);
          variantCount = count || 0;
        }

        const images = Array.isArray(p.images) ? p.images : [];
        const stock = typeof p.stock === 'number' ? p.stock : 0;
        const priceSar = typeof p.price === 'number' ? p.price : 0;
        const priceUsd = priceSar > 0 ? priceSar / 3.75 : 0;

        const imgNorm = Math.max(0, Math.min(1, (images.length || 0) / 15));
        const priceNorm = Math.max(0, Math.min(1, (priceUsd || 0) / 50));
        const dynQuality = Math.max(0, Math.min(1, 0.6 * imgNorm + 0.4 * (1 - priceNorm)));
        const rating = computeRating({
          imageCount: images.length,
          stock,
          variantCount,
          qualityScore: dynQuality,
          priceUsd,
          sentiment: 0,
          orderVolume: 0,
        });

        // Update product
        if (hasDispCol || hasConfCol) {
          const payload: any = {};
          if (hasDispCol) payload.displayed_rating = rating.displayedRating;
          if (hasConfCol) payload.rating_confidence = rating.ratingConfidence;
          await admin.from('products').update(payload).eq('id', p.id);
        }

        // Snapshot signals
        if (hasSignalsTable) {
          await admin.from('product_rating_signals').insert({
            product_id: p.id,
            cj_product_id: p.cj_product_id || null,
            context: 'admin-recompute',
            signals: rating.signals,
            displayed_rating: rating.displayedRating,
            rating_confidence: rating.ratingConfidence,
          });
        }

        results.push({ id: p.id, displayed: rating.displayedRating, confidence: rating.ratingConfidence });
      } catch (e) {
        failures++;
      }
    }

    return NextResponse.json({ ok: true, updated: results.length, failures, results });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}
