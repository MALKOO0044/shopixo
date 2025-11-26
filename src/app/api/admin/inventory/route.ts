import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ensureAdmin } from "@/lib/auth/admin-guard";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const guard = await ensureAdmin();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.reason }, { status: 401 });
  }

  const db = getAdmin();
  if (!db) {
    return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
  }

  try {
    const { data: products, error } = await db
      .from("products")
      .select("id, title, sku, cj_product_id, stock, price, is_active, updated_at")
      .order("stock", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ ok: true, products: products || [] });
  } catch (e: any) {
    console.error("Inventory GET error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Failed to load inventory" }, { status: 500 });
  }
}
