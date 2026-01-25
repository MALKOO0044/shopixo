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
const USD_TO_SAR = 3.75;
const DEFAULT_VAT_PERCENT = 15;
const DEFAULT_PAYMENT_FEE_PERCENT = 2.9;
const DEFAULT_MARGIN_PERCENT = 40;
const DEFAULT_MIN_PROFIT_SAR = 35;
const DEFAULT_SHIPPING_USD = 5;

async function recalculatePrice(costUsd: number, shippingUsd: number, category: string, admin: any): Promise<number> {
  const { data: categoryRule } = await admin
    .from("pricing_rules")
    .select("*")
    .eq("category", category)
    .maybeSingle();

  const { data: defaultRule } = await admin
    .from("pricing_rules")
    .select("*")
    .eq("is_default", true)
    .maybeSingle();

  const rule = categoryRule || defaultRule || {
    margin_percent: DEFAULT_MARGIN_PERCENT,
    min_profit_sar: DEFAULT_MIN_PROFIT_SAR,
    vat_percent: DEFAULT_VAT_PERCENT,
    payment_fee_percent: DEFAULT_PAYMENT_FEE_PERCENT,
    smart_rounding_enabled: true,
    rounding_targets: [49, 79, 99, 149, 199, 249, 299],
  };
  const vatPercent = rule.vat_percent ?? DEFAULT_VAT_PERCENT;
  const paymentFeePercent = rule.payment_fee_percent ?? DEFAULT_PAYMENT_FEE_PERCENT;
  const marginPercent = rule.margin_percent ?? DEFAULT_MARGIN_PERCENT;
  const minProfitSar = rule.min_profit_sar ?? DEFAULT_MIN_PROFIT_SAR;

  const baseSar = costUsd * USD_TO_SAR;
  const shippingSar = shippingUsd * USD_TO_SAR;
  const subtotal = baseSar + shippingSar;
  const vat = subtotal * (vatPercent / 100);
  const afterVat = subtotal + vat;
  const paymentFee = afterVat * (paymentFeePercent / 100);
  const landed = afterVat + paymentFee;
  const margin = landed * (marginPercent / 100);
  let retailSar = landed + margin;

  if (rule.smart_rounding_enabled && rule.rounding_targets?.length > 0) {
    const targets = (rule.rounding_targets as number[]).sort((a, b) => a - b);
    const closest = targets.find(t => t >= retailSar) || targets[targets.length - 1];
    retailSar = closest;
  } else {
    retailSar = Math.ceil(retailSar);
  }

  const profit = retailSar - landed;
  if (profit < minProfitSar) {
    retailSar = landed + minProfitSar;
    if (rule.smart_rounding_enabled && rule.rounding_targets?.length > 0) {
      const targets = (rule.rounding_targets as number[]).sort((a, b) => a - b);
      const closest = targets.find(t => t >= retailSar) || targets[targets.length - 1];
      retailSar = closest;
    }
  }

  return Math.round(retailSar);
}

export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const autoApply = body.autoApply !== false;

    const { data: products } = await admin
      .from("products")
      .select("id, title, price, stock, active, category, metadata")
      .not("metadata->cj_product_id", "is", null)
      .order("updated_at", { ascending: true })
      .limit(200);

    if (!products || products.length === 0) {
      return NextResponse.json({ ok: true, message: "No CJ products to sync", changes: 0 });
    }

    let changesDetected = 0;
    let priceUpdates = 0;
    let stockUpdates = 0;
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

        const avgCostUsd = mapped.variants.length > 0
          ? mapped.variants.reduce((sum, v) => sum + (v.price || 0), 0) / mapped.variants.length
          : 0;
        const totalCjStock = mapped.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
        const adjustedStock = Math.max(0, totalCjStock - SAFETY_BUFFER);

        const currentPrice = product.price ?? 0;
        const currentStock = product.stock ?? 0;
        const shippingUsd = product.metadata?.shipping_usd ?? DEFAULT_SHIPPING_USD;

        if (avgCostUsd > 0) {
          const newRetailSar = await recalculatePrice(avgCostUsd, shippingUsd, product.category || "General", admin);
          
          if (Math.abs(newRetailSar - currentPrice) > 1) {
            const changeType = newRetailSar > currentPrice ? "price_increase" : "price_decrease";
            
            await admin.from("daily_sync_changes").insert({
              shopixo_product_id: product.id,
              cj_product_id: cjProductId,
              change_type: changeType,
              field_changed: "price",
              old_value: currentPrice.toFixed(2),
              new_value: newRetailSar.toFixed(2),
              status: autoApply ? "applied" : "pending",
              sync_date: new Date().toISOString().split("T")[0],
              applied_at: autoApply ? new Date().toISOString() : null,
            });

            if (autoApply) {
              await admin
                .from("products")
                .update({ 
                  price: newRetailSar,
                  metadata: { ...product.metadata, last_price_sync: new Date().toISOString(), cost_usd: avgCostUsd },
                  updated_at: new Date().toISOString(),
                })
                .eq("id", product.id);
              priceUpdates++;
            }
            
            changesDetected++;
          }
        }

        if (adjustedStock !== currentStock) {
          let changeType = "stock_change";
          let shouldAutoApply = autoApply;
          
          if (adjustedStock === 0 && currentStock > 0) {
            changeType = "stock_out";
            shouldAutoApply = true;
          } else if (adjustedStock > 0 && currentStock === 0) {
            changeType = "stock_restored";
          } else if (adjustedStock < 10 && currentStock >= 10) {
            changeType = "stock_low";
          }
          
          await admin.from("daily_sync_changes").insert({
            shopixo_product_id: product.id,
            cj_product_id: cjProductId,
            change_type: changeType,
            field_changed: "stock",
            old_value: String(currentStock),
            new_value: String(adjustedStock),
            status: shouldAutoApply ? "applied" : "pending",
            sync_date: new Date().toISOString().split("T")[0],
            applied_at: shouldAutoApply ? new Date().toISOString() : null,
          });

          if (shouldAutoApply) {
            const shouldReactivate = changeType === "stock_restored";
            await admin
              .from("products")
              .update({ 
                stock: adjustedStock,
                active: adjustedStock === 0 ? false : (shouldReactivate ? true : product.active),
                metadata: { ...product.metadata, last_stock_sync: new Date().toISOString() },
                updated_at: new Date().toISOString(),
              })
              .eq("id", product.id);
            stockUpdates++;
          }
          
          changesDetected++;
        }
      } catch (e) {
        console.error(`Failed to sync product ${cjProductId}:`, e);
        errors++;
      }
    }

    await admin.from("kv_settings").upsert({
      key: "last_sync_run",
      value: { 
        timestamp: new Date().toISOString(), 
        products_checked: products.length, 
        changes: changesDetected,
        price_updates: priceUpdates,
        stock_updates: stockUpdates,
        errors,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });

    await admin.from("import_logs").insert({
      action: "daily_sync",
      status: errors > 0 ? "partial" : "success",
      details: { 
        products_checked: products.length, 
        changes_detected: changesDetected,
        price_updates: priceUpdates,
        stock_updates: stockUpdates,
        errors,
        auto_apply: autoApply,
      },
    });

    return NextResponse.json({
      ok: true,
      productsChecked: products.length,
      changesDetected,
      priceUpdates,
      stockUpdates,
      errors,
    });
  } catch (e: any) {
    console.error("Sync run error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
