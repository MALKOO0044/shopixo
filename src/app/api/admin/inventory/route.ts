import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const LOW_STOCK_THRESHOLD = 10;

export async function GET(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all";
    const search = searchParams.get("search") || "";
    const limit = Math.min(100, Number(searchParams.get("limit") || 20));
    const offset = Number(searchParams.get("offset") || 0);

    let query = admin
      .from("products")
      .select("id, title, title_ar, category, price, stock, active, images, metadata, updated_at, supplier_sku, product_code", { count: "exact" })
      .order("stock", { ascending: true })
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`title.ilike.%${search}%,title_ar.ilike.%${search}%`);
    }

    switch (filter) {
      case "in_stock":
        query = query.gt("stock", LOW_STOCK_THRESHOLD).eq("active", true);
        break;
      case "low_stock":
        query = query.gt("stock", 0).lte("stock", LOW_STOCK_THRESHOLD);
        break;
      case "out_of_stock":
        query = query.eq("stock", 0);
        break;
      case "hidden":
        query = query.eq("active", false);
        break;
    }

    const { data: products, error, count } = await query;

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const { data: allProducts } = await admin
      .from("products")
      .select("stock, active, metadata");

    const stats = {
      total: 0,
      inStock: 0,
      lowStock: 0,
      outOfStock: 0,
      hidden: 0,
      cjProducts: 0,
    };

    (allProducts || []).forEach((p: any) => {
      stats.total++;
      if (p.stock > LOW_STOCK_THRESHOLD) stats.inStock++;
      else if (p.stock > 0) stats.lowStock++;
      else stats.outOfStock++;
      if (!p.active) stats.hidden++;
      if (p.metadata?.cj_product_id) stats.cjProducts++;
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
    const { id, active, stock } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: "Product ID required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    
    if (active !== undefined) updateData.active = active;
    if (stock !== undefined) updateData.stock = stock;

    const { error } = await admin
      .from("products")
      .update(updateData)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
