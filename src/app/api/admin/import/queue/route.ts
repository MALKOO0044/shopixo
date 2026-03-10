import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
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

    query = query.order('quality_score', { ascending: false })
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

    const { count: totalCount } = await supabase
      .from('product_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', status === "all" ? "pending" : status);

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

    const normalizedProducts = (products || []).map((product: any) => ({
      ...product,
      images: normalizeQueueImages(product?.images),
    }));

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
