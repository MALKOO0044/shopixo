import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

import { calculateRetailSar, usdToSar } from "@/lib/pricing";

import { enhanceProductImageUrl } from "@/lib/media/image-quality";



export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';



function getSupabaseAdmin() {

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key);

}



function isDbConfigured(): boolean {

  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

}



function normalizeQueueImages(value: unknown): string[] {

  let source: unknown[] = [];



  if (Array.isArray(value)) {

    source = value;

  } else if (typeof value === "string") {

    const trimmed = value.trim();

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {

      try {

        const parsed = JSON.parse(trimmed);

        if (Array.isArray(parsed)) source = parsed;

      } catch {}

    }

  }



  return source

    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)

    .map((url) => enhanceProductImageUrl(url, "gallery"))

    .filter((url) => /^https?:\/\//i.test(url));

}



function normalizeQueuePid(value: unknown): string {

  return String(value ?? "").trim();

}



function parseQueueArray(value: unknown): unknown[] {

  if (Array.isArray(value)) return value;

  if (typeof value === "string") {

    const trimmed = value.trim();

    if (!trimmed) return [];

    try {

      const parsed = JSON.parse(trimmed);

      return Array.isArray(parsed) ? parsed : [];

    } catch {

      return [];

    }

  }

  return [];

}



function normalizeQueueText(value: unknown): string {

  return String(value ?? "").trim();

}



function isQueueFallbackName(value: unknown): boolean {

  const lowered = normalizeQueueText(value).toLowerCase();

  return lowered.length === 0 || lowered.startsWith("unavailable cj product") || lowered.startsWith("untitled ");

}



function preferQueuePositiveNumber(primary: unknown, fallback: unknown): number | null {

  const primaryNum = Number(primary);

  if (Number.isFinite(primaryNum) && primaryNum > 0) return primaryNum;

  const fallbackNum = Number(fallback);

  if (Number.isFinite(fallbackNum) && fallbackNum > 0) return fallbackNum;

  return null;

}



function mergeQueuePreviewFields(baseRow: Record<string, any>, candidateRow: Record<string, any> | null): Record<string, any> {

  if (!candidateRow) return baseRow;

  const baseImages = normalizeQueueImages(baseRow?.images);

  const candidateImages = normalizeQueueImages(candidateRow?.images);

  const baseVariantsCount =

    parseQueueArray(baseRow?.variants).length + parseQueueArray(baseRow?.variant_pricing).length;

  const baseName = normalizeQueueText(baseRow?.name_en);

  const candidateName = normalizeQueueText(candidateRow?.name_en);

  const baseCategory = normalizeQueueText(baseRow?.category_name || baseRow?.category);

  const candidateCategory = normalizeQueueText(candidateRow?.category_name || candidateRow?.category);

  const shouldUseCandidateName = isQueueFallbackName(baseName) && !isQueueFallbackName(candidateName);

  const shouldUseCandidateCategory =

    (!baseCategory || baseCategory.toLowerCase() === "general") &&

    candidateCategory.length > 0 &&

    candidateCategory.toLowerCase() !== "general";

  return {

    ...baseRow,

    name_en: shouldUseCandidateName ? candidateRow?.name_en : baseRow?.name_en,

    category: shouldUseCandidateCategory ? (candidateRow?.category ?? candidateCategory) : baseRow?.category,

    category_name: shouldUseCandidateCategory ? (candidateRow?.category_name ?? candidateCategory) : baseRow?.category_name,

    store_sku: normalizeQueueText(baseRow?.store_sku) ? baseRow?.store_sku : candidateRow?.store_sku,

    product_code: normalizeQueueText(baseRow?.product_code) ? baseRow?.product_code : candidateRow?.product_code,

    images: baseImages.length > 0 ? baseImages : candidateImages,

    variants: baseVariantsCount > 0 ? baseRow?.variants : candidateRow?.variants,

    variant_pricing: parseQueueArray(baseRow?.variant_pricing).length > 0 ? baseRow?.variant_pricing : candidateRow?.variant_pricing,

    available_sizes: parseQueueArray(baseRow?.available_sizes).length > 0 ? baseRow?.available_sizes : candidateRow?.available_sizes,

    available_colors: parseQueueArray(baseRow?.available_colors).length > 0 ? baseRow?.available_colors : candidateRow?.available_colors,

    calculated_retail_sar:

      preferQueuePositiveNumber(baseRow?.calculated_retail_sar, candidateRow?.calculated_retail_sar) ??

      baseRow?.calculated_retail_sar ??

      candidateRow?.calculated_retail_sar,

    cj_price_usd:

      preferQueuePositiveNumber(baseRow?.cj_price_usd, candidateRow?.cj_price_usd) ??

      baseRow?.cj_price_usd ??

      candidateRow?.cj_price_usd,

    displayed_rating:

      preferQueuePositiveNumber(baseRow?.displayed_rating, candidateRow?.displayed_rating) ??

      baseRow?.displayed_rating ??

      candidateRow?.displayed_rating,

    supplier_rating:

      preferQueuePositiveNumber(baseRow?.supplier_rating, candidateRow?.supplier_rating) ??

      baseRow?.supplier_rating ??

      candidateRow?.supplier_rating,

    rating_confidence:

      preferQueuePositiveNumber(baseRow?.rating_confidence, candidateRow?.rating_confidence) ??

      baseRow?.rating_confidence ??

      candidateRow?.rating_confidence,

    review_count:

      preferQueuePositiveNumber(baseRow?.review_count, candidateRow?.review_count) ??

      baseRow?.review_count ??

      candidateRow?.review_count,

    stock_total:

      preferQueuePositiveNumber(baseRow?.stock_total, candidateRow?.stock_total) ??

      baseRow?.stock_total ??

      candidateRow?.stock_total,

    video_url: normalizeQueueText(baseRow?.video_url) ? baseRow?.video_url : candidateRow?.video_url,

    video_source_url: normalizeQueueText(baseRow?.video_source_url) ? baseRow?.video_source_url : candidateRow?.video_source_url,

    video_4k_url: normalizeQueueText(baseRow?.video_4k_url) ? baseRow?.video_4k_url : candidateRow?.video_4k_url,

    has_video: typeof baseRow?.has_video === "boolean" ? baseRow?.has_video : candidateRow?.has_video,

  };

}



export async function GET(req: NextRequest) {

  try {

    if (!isDbConfigured()) {

      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });

    }



    const supabase = getSupabaseAdmin();

    if (!supabase) {

      return NextResponse.json({ ok: false, error: "Database connection failed" }, { status: 500 });

    }



    const { searchParams } = new URL(req.url);

    const pid = normalizeQueuePid(searchParams.get("pid"));

    if (pid) {

      const { data: singleRows, error: singleQueryError } = await supabase

        .from('product_queue')

        .select('*')

        .eq('cj_product_id', pid)

        .order('updated_at', { ascending: false })

        .order('created_at', { ascending: false })

        .limit(1);

      if (singleQueryError) {

        console.error("[Queue GET pid] Query error:", singleQueryError);

        return NextResponse.json({ ok: false, error: singleQueryError.message }, { status: 500 });

      }

      const singleProduct = Array.isArray(singleRows) && singleRows.length > 0 ? singleRows[0] : null;

      if (!singleProduct) {

        return NextResponse.json({ ok: false, error: "Queue product not found" }, { status: 404 });

      }

      return NextResponse.json({

        ok: true,

        product: {

          ...singleProduct,

          images: normalizeQueueImages(singleProduct?.images),

        },

      });

    }

    const status = searchParams.get("status") || "pending";

    const batchId = searchParams.get("batch_id");

    const category = searchParams.get("category");

    const limit = Math.min(100, Number(searchParams.get("limit") || 50));

    const offset = Number(searchParams.get("offset") || 0);



    let query = supabase.from('product_queue').select('*');

    

    if (status !== "all") {

      query = query.eq('status', status);

    }

    if (batchId) {

      query = query.eq('batch_id', Number(batchId));

    }

    if (category && category !== "all") {

      query = query.eq('category', category);

    }



    query = query.order('updated_at', { ascending: false })

                 .order('quality_score', { ascending: false })

                 .order('created_at', { ascending: false })

                 .range(offset, offset + limit - 1);



    const { data: products, error: queryError } = await query;



    if (queryError) {

      console.error("[Queue GET] Query error:", queryError);

      if (queryError.message.includes('does not exist')) {

        return NextResponse.json({ 

          ok: false, 

          error: "Import tables not found. Please run the database migration first." 

        }, { status: 500 });

      }

      return NextResponse.json({ ok: false, error: queryError.message }, { status: 500 });

    }



    let totalCountQuery = supabase

      .from('product_queue')

      .select('*', { count: 'exact', head: true });

    if (status !== "all") {

      totalCountQuery = totalCountQuery.eq('status', status);

    }

    if (batchId) {

      totalCountQuery = totalCountQuery.eq('batch_id', Number(batchId));

    }

    if (category && category !== "all") {

      totalCountQuery = totalCountQuery.eq('category', category);

    }

    const { count: totalCount } = await totalCountQuery;



    const [pendingRes, approvedRes, rejectedRes, importedRes] = await Promise.all([

      supabase.from('product_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),

      supabase.from('product_queue').select('*', { count: 'exact', head: true }).eq('status', 'approved'),

      supabase.from('product_queue').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),

      supabase.from('product_queue').select('*', { count: 'exact', head: true }).eq('status', 'imported'),

    ]);



    const stats = {

      pending: pendingRes.count || 0,

      approved: approvedRes.count || 0,

      rejected: rejectedRes.count || 0,

      imported: importedRes.count || 0,

    };



    const queueRows = Array.isArray(products) ? products : [];

    const rowPids = Array.from(

      new Set(

        queueRows

          .map((row: any) => normalizeQueuePid(row?.cj_product_id))

          .filter((rowPid) => rowPid.length > 0)

      )

    );

    const bestRowByPid = new Map<string, Record<string, any>>();

    if (rowPids.length > 0) {

      const { data: candidateRows, error: candidateRowsError } = await supabase

        .from('product_queue')

        .select('*')

        .in('cj_product_id', rowPids)

        .order('updated_at', { ascending: false })

        .order('created_at', { ascending: false });

      if (!candidateRowsError && Array.isArray(candidateRows)) {

        for (const row of candidateRows) {

          const rowPid = normalizeQueuePid(row?.cj_product_id);

          if (!rowPid || bestRowByPid.has(rowPid)) continue;

          bestRowByPid.set(rowPid, row as Record<string, any>);

        }

      }

    }

    const normalizedProducts = queueRows.map((product: any) => {

      const rowPid = normalizeQueuePid(product?.cj_product_id);

      const candidateRow = rowPid ? bestRowByPid.get(rowPid) || null : null;

      const mergedRow = mergeQueuePreviewFields(product, candidateRow);

      return {

        ...mergedRow,

        images: normalizeQueueImages(mergedRow?.images),

      };

    });



    return NextResponse.json({

      ok: true,

      products: normalizedProducts,

      total: totalCount || 0,

      stats,

    });

  } catch (e: any) {

    console.error("[Queue GET] Error:", e);

    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });

  }

}



export async function PATCH(req: NextRequest) {

  try {

    if (!isDbConfigured()) {

      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });

    }



    const supabase = getSupabaseAdmin();

    if (!supabase) {

      return NextResponse.json({ ok: false, error: "Database connection failed" }, { status: 500 });

    }



    const body = await req.json();

    const { ids, action, data } = body;



    if (!ids || !Array.isArray(ids) || ids.length === 0) {

      return NextResponse.json({ ok: false, error: "No product IDs provided" }, { status: 400 });

    }



    let updateData: Record<string, any> = { updated_at: new Date().toISOString() };



    switch (action) {

      case "approve":

        updateData.status = 'approved';

        updateData.reviewed_at = new Date().toISOString();

        break;

      case "reject":

        updateData.status = 'rejected';

        updateData.reviewed_at = new Date().toISOString();

        break;

      case "pending":

        updateData.status = 'pending';

        updateData.reviewed_at = null;

        break;

      case "update":

        if (data) {

          if (data.name_en) updateData.name_en = data.name_en;

          if (data.name_ar) updateData.name_ar = data.name_ar;

          if (data.description_en) updateData.description_en = data.description_en;

          if (data.description_ar) updateData.description_ar = data.description_ar;

          if (data.category) updateData.category = data.category;

          if (data.admin_notes !== undefined) updateData.admin_notes = data.admin_notes;

          if (data.calculated_retail_sar) updateData.calculated_retail_sar = data.calculated_retail_sar;

          if (data.margin_applied) updateData.margin_applied = data.margin_applied;

        }

        break;

      default:

        return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });

    }



    const { error: updateError } = await supabase

      .from('product_queue')

      .update(updateData)

      .in('id', ids);



    if (updateError) {

      console.error("[Queue PATCH] Update error:", updateError);

      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });

    }



    try {

      await supabase.from('import_logs').insert({

        action: `queue_${action}`,

        status: 'success',

        details: { ids, action, data }

      });

    } catch (logErr) {

      console.error("[Queue PATCH] Log error:", logErr);

    }



    return NextResponse.json({ ok: true, updated: ids.length });

  } catch (e: any) {

    console.error("[Queue PATCH] Error:", e);

    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });

  }

}



export async function DELETE(req: NextRequest) {

  try {

    if (!isDbConfigured()) {

      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });

    }



    const supabase = getSupabaseAdmin();

    if (!supabase) {

      return NextResponse.json({ ok: false, error: "Database connection failed" }, { status: 500 });

    }



    const { searchParams } = new URL(req.url);

    const idsParam = searchParams.get("ids");



    if (!idsParam) {

      return NextResponse.json({ ok: false, error: "No IDs provided" }, { status: 400 });

    }



    const ids = idsParam.split(",").map(Number).filter(n => !isNaN(n));

    if (ids.length === 0) {

      return NextResponse.json({ ok: false, error: "Invalid IDs" }, { status: 400 });

    }



    const { error: deleteError } = await supabase

      .from('product_queue')

      .delete()

      .in('id', ids);



    if (deleteError) {

      console.error("[Queue DELETE] Delete error:", deleteError);

      return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 });

    }



    return NextResponse.json({ ok: true, deleted: ids.length });

  } catch (e: any) {

    console.error("[Queue DELETE] Error:", e);

    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });

  }

}

