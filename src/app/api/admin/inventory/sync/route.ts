import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { queryProductByPidOrKeyword, mapCjItemToProductLike } from "@/lib/cj/v2";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const SAFETY_BUFFER = 5;

export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    const { data: products } = await admin
      .from("products")
      .select("id, title, stock, active, metadata")
      .not("metadata->cj_product_id", "is", null)
      .limit(100);

    if (!products || products.length === 0) {
      return NextResponse.json({ ok: true, message: "No CJ products to sync", updated: 0, outOfStock: 0 });
    }

    let updated = 0;
    let outOfStock = 0;
    let errors = 0;

    for (const product of products) {
      const cjProductId = product.metadata?.cj_product_id;
      if (!cjProductId) continue;

      try {
        const result = await queryProductByPidOrKeyword({ pid: cjProductId });
        const cjProducts = result?.data?.content || result?.data?.list || [];
        
        if (cjProducts.length === 0) {
          errors++;
          continue;
        }

        const mapped = mapCjItemToProductLike(cjProducts[0]);
        if (!mapped) {
          errors++;
          continue;
        }

        const totalCjStock = mapped.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
        const adjustedStock = Math.max(0, totalCjStock - SAFETY_BUFFER);

        const updateData: Record<string, any> = {
          stock: adjustedStock,
          "metadata->last_stock_sync": new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (adjustedStock === 0 && product.active) {
          updateData.active = false;
          outOfStock++;
          
          await admin.from("daily_sync_changes").insert({
            shopixo_product_id: product.id,
            cj_product_id: cjProductId,
            change_type: "stock_out",
            field_changed: "stock",
            old_value: String(product.stock || 0),
            new_value: "0",
            status: "applied",
            sync_date: new Date().toISOString().split("T")[0],
            applied_at: new Date().toISOString(),
          });
        } else if (adjustedStock > 0 && !product.active && (product.stock || 0) === 0) {
          updateData.active = true;
          
          await admin.from("daily_sync_changes").insert({
            shopixo_product_id: product.id,
            cj_product_id: cjProductId,
            change_type: "stock_restored",
            field_changed: "stock",
            old_value: "0",
            new_value: String(adjustedStock),
            status: "applied",
            sync_date: new Date().toISOString().split("T")[0],
            applied_at: new Date().toISOString(),
          });
        }

        const variants = mapped.variants.map((v, i) => ({
          ...((product.metadata?.variants || [])[i] || {}),
          stock: Math.max(0, (v.stock || 0) - SAFETY_BUFFER),
          cj_stock: v.stock,
        }));

        await admin
          .from("products")
          .update({
            stock: adjustedStock,
            active: adjustedStock > 0 ? product.active : false,
            metadata: {
              ...product.metadata,
              last_stock_sync: new Date().toISOString(),
              variants,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", product.id);

        updated++;

      } catch (e) {
        console.error(`Failed to sync product ${cjProductId}:`, e);
        errors++;
      }
    }

    await admin.from("import_logs").insert({
      action: "inventory_sync",
      status: errors > 0 ? "partial" : "success",
      details: { 
        products_checked: products.length, 
        updated, 
        outOfStock, 
        errors 
      },
    });

    await admin.from("kv_settings").upsert({
      key: "last_inventory_sync",
      value: { timestamp: new Date().toISOString(), updated, outOfStock },
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });

    return NextResponse.json({
      ok: true,
      checked: products.length,
      updated,
      outOfStock,
      errors,
    });
  } catch (e: any) {
    console.error("Inventory sync error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
