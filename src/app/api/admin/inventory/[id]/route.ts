import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ensureAdmin } from "@/lib/auth/admin-guard";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await ensureAdmin();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.reason }, { status: 401 });
  }

  const db = getAdmin();
  if (!db) {
    return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
  }

  try {
    const productId = parseInt(params.id);
    if (isNaN(productId)) {
      return NextResponse.json({ ok: false, error: "Invalid product ID" }, { status: 400 });
    }

    const body = await req.json();
    const updates: Record<string, any> = {};

    if (typeof body.is_active === "boolean") {
      updates.is_active = body.is_active;
    }
    if (typeof body.stock === "number") {
      updates.stock = Math.max(0, body.stock);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: "No valid updates provided" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { error } = await db
      .from("products")
      .update(updates)
      .eq("id", productId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Inventory PATCH error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Failed to update product" }, { status: 500 });
  }
}
