import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    const limit = Math.min(100, Number(searchParams.get("limit") || 50));

    let query = admin
      .from("daily_sync_changes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data: changes, error } = await query;

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const { data: allChanges } = await admin
      .from("daily_sync_changes")
      .select("status, change_type");

    const stats = {
      pending: 0,
      applied: 0,
      dismissed: 0,
      price_changes: 0,
      stock_changes: 0,
      out_of_stock: 0,
    };

    (allChanges || []).forEach((c: any) => {
      if (c.status === "pending") stats.pending++;
      else if (c.status === "applied") stats.applied++;
      else if (c.status === "dismissed") stats.dismissed++;
      
      if (c.change_type?.includes("price")) stats.price_changes++;
      if (c.change_type?.includes("stock")) stats.stock_changes++;
      if (c.change_type === "stock_out") stats.out_of_stock++;
    });

    const { data: lastSyncRow } = await admin
      .from("kv_settings")
      .select("value")
      .eq("key", "last_sync_run")
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      changes: changes || [],
      stats,
      lastSync: lastSyncRow?.value?.timestamp || null,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action } = body;

    if (!id || !action) {
      return NextResponse.json({ ok: false, error: "Missing id or action" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    let updateData: Record<string, any> = {};

    if (action === "apply") {
      updateData = { status: "applied", applied_at: new Date().toISOString() };
      
      const { data: change } = await admin
        .from("daily_sync_changes")
        .select("*")
        .eq("id", id)
        .single();

      if (change && change.shopixo_product_id) {
        if (change.field_changed === "price") {
          await admin
            .from("products")
            .update({ price: Number(change.new_value) })
            .eq("id", change.shopixo_product_id);
        } else if (change.field_changed === "stock") {
          const newStock = Number(change.new_value);
          await admin
            .from("products")
            .update({ 
              stock: newStock,
              active: newStock > 0,
            })
            .eq("id", change.shopixo_product_id);
        }
      }
    } else if (action === "dismiss") {
      updateData = { status: "dismissed" };
    } else {
      return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
    }

    const { error } = await admin
      .from("daily_sync_changes")
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action !== "apply_all") {
      return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    const { data: pendingChanges } = await admin
      .from("daily_sync_changes")
      .select("*")
      .eq("status", "pending");

    let appliedCount = 0;

    for (const change of (pendingChanges || [])) {
      if (change.shopixo_product_id) {
        if (change.field_changed === "price") {
          await admin
            .from("products")
            .update({ price: Number(change.new_value) })
            .eq("id", change.shopixo_product_id);
        } else if (change.field_changed === "stock") {
          const newStock = Number(change.new_value);
          await admin
            .from("products")
            .update({ 
              stock: newStock,
              active: newStock > 0,
            })
            .eq("id", change.shopixo_product_id);
        }
      }

      await admin
        .from("daily_sync_changes")
        .update({ status: "applied", applied_at: new Date().toISOString() })
        .eq("id", change.id);
      
      appliedCount++;
    }

    return NextResponse.json({ ok: true, applied: appliedCount });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
