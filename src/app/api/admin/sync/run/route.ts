import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { listCjProductsPage, queryProductByPidOrKeyword, mapCjItemToProductLike } from "@/lib/cj/v2";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    const { data: products } = await admin
      .from("products")
      .select("id, title, price, stock, active, metadata")
      .not("metadata->cj_product_id", "is", null)
      .limit(100);

    if (!products || products.length === 0) {
      return NextResponse.json({ ok: true, message: "No CJ products to sync", changes: 0 });
    }

    let changesDetected = 0;

    for (const product of products) {
      const cjProductId = product.metadata?.cj_product_id;
      if (!cjProductId) continue;

      try {
        const result = await queryProductByPidOrKeyword({ pid: cjProductId });
        const cjProducts = result?.data?.content || result?.data?.list || [];
        
        if (cjProducts.length === 0) continue;

        const mapped = mapCjItemToProductLike(cjProducts[0]);
        if (!mapped) continue;

        const avgPrice = mapped.variants.length > 0
          ? mapped.variants.reduce((sum, v) => sum + (v.price || 0), 0) / mapped.variants.length
          : 0;
        const totalStock = mapped.variants.reduce((sum, v) => sum + (v.stock || 0), 0);

        const currentPrice = product.price || 0;
        const currentStock = product.stock || 0;

        if (avgPrice > 0 && Math.abs(avgPrice - currentPrice) > 0.5) {
          const changeType = avgPrice > currentPrice ? "price_increase" : "price_decrease";
          
          await admin.from("daily_sync_changes").insert({
            shopixo_product_id: product.id,
            cj_product_id: cjProductId,
            change_type: changeType,
            field_changed: "price",
            old_value: currentPrice.toFixed(2),
            new_value: avgPrice.toFixed(2),
            status: "pending",
            sync_date: new Date().toISOString().split("T")[0],
          });
          
          changesDetected++;
        }

        if (totalStock !== currentStock) {
          let changeType = "stock_change";
          if (totalStock === 0 && currentStock > 0) {
            changeType = "stock_out";
            await admin
              .from("products")
              .update({ active: false })
              .eq("id", product.id);
          } else if (totalStock > 0 && currentStock === 0) {
            changeType = "stock_restored";
          } else if (totalStock < 10 && currentStock >= 10) {
            changeType = "stock_low";
          }
          
          await admin.from("daily_sync_changes").insert({
            shopixo_product_id: product.id,
            cj_product_id: cjProductId,
            change_type: changeType,
            field_changed: "stock",
            old_value: String(currentStock),
            new_value: String(totalStock),
            status: changeType === "stock_out" ? "applied" : "pending",
            sync_date: new Date().toISOString().split("T")[0],
            applied_at: changeType === "stock_out" ? new Date().toISOString() : null,
          });
          
          changesDetected++;
        }
      } catch (e) {
        console.error(`Failed to sync product ${cjProductId}:`, e);
      }
    }

    await admin.from("kv_settings").upsert({
      key: "last_sync_run",
      value: { timestamp: new Date().toISOString(), products_checked: products.length, changes: changesDetected },
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });

    await admin.from("import_logs").insert({
      action: "daily_sync",
      status: "success",
      details: { products_checked: products.length, changes_detected: changesDetected },
    });

    return NextResponse.json({
      ok: true,
      productsChecked: products.length,
      changesDetected,
    });
  } catch (e: any) {
    console.error("Sync run error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
