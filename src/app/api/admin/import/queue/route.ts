import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateRetailSar, usdToSar } from "@/lib/pricing";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "pending";
    const batchId = searchParams.get("batch_id");
    const category = searchParams.get("category");
    const limit = Math.min(100, Number(searchParams.get("limit") || 50));
    const offset = Number(searchParams.get("offset") || 0);

    let query = admin
      .from("product_queue")
      .select("*", { count: "exact" })
      .order("quality_score", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== "all") {
      query = query.eq("status", status);
    }
    if (batchId) {
      query = query.eq("batch_id", Number(batchId));
    }
    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    const { data: products, error, count } = await query;

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const { data: stats } = await admin
      .from("product_queue")
      .select("status")
      .then(res => {
        const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0, imported: 0 };
        (res.data || []).forEach((p: any) => {
          counts[p.status] = (counts[p.status] || 0) + 1;
        });
        return { data: counts };
      });

    return NextResponse.json({
      ok: true,
      products: products || [],
      total: count || 0,
      stats,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { ids, action, data } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ ok: false, error: "No product IDs provided" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    let updateData: Record<string, any> = { updated_at: new Date().toISOString() };

    switch (action) {
      case "approve":
        updateData.status = "approved";
        updateData.reviewed_at = new Date().toISOString();
        break;
      case "reject":
        updateData.status = "rejected";
        updateData.reviewed_at = new Date().toISOString();
        break;
      case "pending":
        updateData.status = "pending";
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

    const { error } = await admin
      .from("product_queue")
      .update(updateData)
      .in("id", ids);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    await admin
      .from("import_logs")
      .insert({
        action: `queue_${action}`,
        status: "success",
        details: { ids, action, data },
      });

    return NextResponse.json({ ok: true, updated: ids.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get("ids");

    if (!idsParam) {
      return NextResponse.json({ ok: false, error: "No IDs provided" }, { status: 400 });
    }

    const ids = idsParam.split(",").map(Number).filter(n => !isNaN(n));
    if (ids.length === 0) {
      return NextResponse.json({ ok: false, error: "Invalid IDs" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    const { error } = await admin
      .from("product_queue")
      .delete()
      .in("id", ids);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deleted: ids.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
