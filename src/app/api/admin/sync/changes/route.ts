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
    const url = new URL(req.url);
    const typeFilter = url.searchParams.get("type");
    const statusFilter = url.searchParams.get("status") || "pending";
    const limit = Math.min(500, parseInt(url.searchParams.get("limit") || "100"));

    let query = db
      .from("daily_sync_changes")
      .select(`
        id,
        product_id,
        cj_product_id,
        change_type,
        old_value,
        new_value,
        change_amount,
        status,
        detected_at,
        reviewed_at
      `)
      .order("detected_at", { ascending: false })
      .limit(limit);

    if (typeFilter && typeFilter !== "all") {
      query = query.eq("change_type", typeFilter);
    }
    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data: changes, error } = await query;
    if (error) throw error;

    const productIds = [...new Set((changes || []).map(c => c.product_id))];
    let productMap: Record<number, { title: string; sku: string | null }> = {};

    if (productIds.length > 0) {
      const { data: products } = await db
        .from("products")
        .select("id, title, sku")
        .in("id", productIds);
      
      if (products) {
        productMap = Object.fromEntries(products.map(p => [p.id, { title: p.title, sku: p.sku }]));
      }
    }

    const enrichedChanges = (changes || []).map(c => ({
      ...c,
      product_title: productMap[c.product_id]?.title || null,
      product_sku: productMap[c.product_id]?.sku || null,
    }));

    return NextResponse.json({ ok: true, changes: enrichedChanges });
  } catch (e: any) {
    console.error("Sync changes GET error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Failed to load changes" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await ensureAdmin();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.reason }, { status: 401 });
  }

  const db = getAdmin();
  if (!db) {
    return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { ids, action } = body;

    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 500) {
      return NextResponse.json({ ok: false, error: "ids must be array of 1-500 items" }, { status: 400 });
    }
    if (!ids.every(id => typeof id === "number" && Number.isInteger(id) && id > 0)) {
      return NextResponse.json({ ok: false, error: "ids must be positive integers" }, { status: 400 });
    }
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ ok: false, error: "action must be approve or reject" }, { status: 400 });
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    if (action === "approve") {
      const { data: changes } = await db
        .from("daily_sync_changes")
        .select("*")
        .in("id", ids)
        .eq("status", "pending");

      if (changes && changes.length > 0) {
        for (const change of changes) {
          const updates: Record<string, any> = {};
          
          if (change.change_type === "price" && change.new_value) {
            const newPrice = parseFloat(change.new_value);
            if (!isNaN(newPrice)) {
              updates.price = newPrice;
            }
          }
          
          if (change.change_type === "stock" && change.new_value) {
            const newStock = parseInt(change.new_value);
            if (!isNaN(newStock)) {
              updates.stock = newStock;
              if (newStock === 0) {
                updates.is_active = false;
              }
            }
          }
          
          if (change.change_type === "shipping" && change.new_value) {
            updates.shipping_cost = parseFloat(change.new_value) || null;
          }

          if (Object.keys(updates).length > 0) {
            updates.updated_at = new Date().toISOString();
            await db.from("products").update(updates).eq("id", change.product_id);
          }
        }
      }
    }

    const { error: updateError } = await db
      .from("daily_sync_changes")
      .update({
        status: newStatus,
        reviewed_at: new Date().toISOString(),
      })
      .in("id", ids);

    if (updateError) throw updateError;

    await db.from("import_logs").insert({
      action: `sync_${action}`,
      status: "success",
      message: `${action}d ${ids.length} sync changes`,
      details: { ids, action },
    });

    return NextResponse.json({ ok: true, updated: ids.length });
  } catch (e: any) {
    console.error("Sync changes PATCH error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Failed to update changes" }, { status: 500 });
  }
}
