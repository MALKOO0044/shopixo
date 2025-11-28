import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, keywords, category, filters, products } = body;
    
    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ ok: false, error: "No products provided" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    const { data: batch, error: batchErr } = await admin
      .from("import_batches")
      .insert({
        name: name || `Import ${new Date().toISOString()}`,
        keywords: keywords || "",
        category: category || "General",
        filters: filters || {},
        status: "active",
        products_found: products.length,
        products_approved: 0,
        products_imported: 0,
      })
      .select("id")
      .single();

    if (batchErr || !batch) {
      console.error("Failed to create batch:", batchErr);
      return NextResponse.json({ ok: false, error: batchErr?.message || "Failed to create batch" }, { status: 500 });
    }

    const queueItems = products.map((p: any) => {
      const avgPrice = p.variants?.length > 0
        ? p.variants.reduce((sum: number, v: any) => sum + (v.price || 0), 0) / p.variants.length
        : 0;
      const totalStock = p.variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || 0;

      return {
        batch_id: batch.id,
        cj_product_id: p.pid || p.productId,
        cj_sku: p.variants?.[0]?.cjSku || null,
        name_en: p.name || "Untitled",
        name_ar: null,
        description_en: p.description || null,
        description_ar: null,
        category: category || "General",
        images: p.images || [],
        video_url: p.videoUrl || null,
        variants: p.variants || [],
        cj_price_usd: avgPrice,
        shipping_cost_usd: null,
        calculated_retail_sar: null,
        margin_applied: null,
        supplier_rating: p.supplierRating || 4.0,
        total_sales: p.totalSales || 0,
        stock_total: totalStock,
        processing_days: p.processingDays || 3,
        delivery_days_min: p.deliveryDaysMin || 7,
        delivery_days_max: p.deliveryDaysMax || 15,
        quality_score: p.qualityScore || 0.75,
        status: "pending",
        admin_notes: null,
        reviewed_by: null,
        reviewed_at: null,
        shopixo_product_id: null,
        imported_at: null,
      };
    });

    const { error: queueErr } = await admin
      .from("product_queue")
      .upsert(queueItems, { onConflict: "cj_product_id" });

    if (queueErr) {
      console.error("Failed to add to queue:", queueErr);
      return NextResponse.json({ ok: false, error: queueErr.message }, { status: 500 });
    }

    await admin
      .from("import_logs")
      .insert({
        batch_id: batch.id,
        action: "batch_created",
        status: "success",
        details: { products_count: products.length, keywords, category },
      });

    return NextResponse.json({
      ok: true,
      batchId: batch.id,
      productsAdded: products.length,
    });
  } catch (e: any) {
    console.error("Batch creation error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    const { data: batches, error } = await admin
      .from("import_batches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, batches });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
