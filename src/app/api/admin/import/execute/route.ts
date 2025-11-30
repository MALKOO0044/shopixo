import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const USD_TO_SAR = 3.75;
const DEFAULT_SHIPPING_USD = 5;
const DEFAULT_VAT_PERCENT = 15;
const DEFAULT_PAYMENT_FEE_PERCENT = 2.9;
const DEFAULT_MARGIN_PERCENT = 40;
const DEFAULT_MIN_PROFIT_SAR = 35;

async function calculateRetailPrice(costUsd: number, shippingUsd: number | null, category: string, admin: any): Promise<{
  retailSar: number;
  marginApplied: number;
  breakdown: Record<string, number>;
}> {
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

  const pricingRule = categoryRule || defaultRule || {
    margin_percent: DEFAULT_MARGIN_PERCENT,
    min_profit_sar: DEFAULT_MIN_PROFIT_SAR,
    vat_percent: DEFAULT_VAT_PERCENT,
    payment_fee_percent: DEFAULT_PAYMENT_FEE_PERCENT,
    smart_rounding_enabled: true,
    rounding_targets: [49, 79, 99, 149, 199, 249, 299],
  };

  const vatPercent = pricingRule.vat_percent ?? DEFAULT_VAT_PERCENT;
  const paymentFeePercent = pricingRule.payment_fee_percent ?? DEFAULT_PAYMENT_FEE_PERCENT;
  const marginPercent = pricingRule.margin_percent ?? DEFAULT_MARGIN_PERCENT;
  const minProfitSar = pricingRule.min_profit_sar ?? DEFAULT_MIN_PROFIT_SAR;

  const effectiveShippingUsd = shippingUsd ?? DEFAULT_SHIPPING_USD;

  const baseSar = costUsd * USD_TO_SAR;
  const shippingSar = effectiveShippingUsd * USD_TO_SAR;
  const subtotal = baseSar + shippingSar;
  
  const vat = subtotal * (vatPercent / 100);
  const afterVat = subtotal + vat;
  const paymentFee = afterVat * (paymentFeePercent / 100);
  const landed = afterVat + paymentFee;
  const margin = landed * (marginPercent / 100);
  let retailSar = landed + margin;

  if (pricingRule.smart_rounding_enabled && pricingRule.rounding_targets?.length > 0) {
    const targets = (pricingRule.rounding_targets as number[]).sort((a, b) => a - b);
    const closest = targets.find(t => t >= retailSar) || targets[targets.length - 1];
    retailSar = closest;
  } else {
    retailSar = Math.ceil(retailSar);
  }

  const profit = retailSar - landed;
  if (profit < minProfitSar) {
    retailSar = landed + minProfitSar;
    if (pricingRule.smart_rounding_enabled && pricingRule.rounding_targets?.length > 0) {
      const targets = (pricingRule.rounding_targets as number[]).sort((a, b) => a - b);
      const closest = targets.find(t => t >= retailSar) || targets[targets.length - 1];
      retailSar = closest;
    }
  }

  return {
    retailSar: Math.round(retailSar),
    marginApplied: marginPercent,
    breakdown: {
      baseSar,
      shippingSar,
      vat,
      paymentFee,
      margin,
      landed,
      vatPercent,
      paymentFeePercent,
    },
  };
}

function generateSku(prefix: string, productId: string, variantIndex: number): string {
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${productId.slice(-4).toUpperCase()}-${variantIndex + 1}-${random}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productIds } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ ok: false, error: "No product IDs provided" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
    }

    const { data: queueProducts, error: queueError } = await admin
      .from('product_queue')
      .select('*')
      .in('id', productIds)
      .eq('status', 'approved');

    if (queueError) {
      console.error("[Import Execute] Queue query error:", queueError);
      return NextResponse.json({ ok: false, error: queueError.message }, { status: 500 });
    }

    if (!queueProducts || queueProducts.length === 0) {
      return NextResponse.json({ ok: false, error: "No approved products found in queue" }, { status: 400 });
    }

    const results: { id: number; success: boolean; shopixoId?: string; error?: string }[] = [];

    for (const qp of queueProducts) {
      try {
        const { data: existing } = await admin
          .from("products")
          .select("id")
          .eq("metadata->cj_product_id", qp.cj_product_id)
          .maybeSingle();

        if (existing) {
          await admin
            .from('product_queue')
            .update({
              status: 'imported',
              shopixo_product_id: existing.id,
              imported_at: new Date().toISOString()
            })
            .eq('id', qp.id);

          results.push({ id: qp.id, success: true, shopixoId: existing.id, error: "Already imported" });
          continue;
        }

        const avgPrice = qp.cj_price_usd ?? 0;
        const shippingCost = qp.shipping_cost_usd ?? DEFAULT_SHIPPING_USD;
        const pricing = await calculateRetailPrice(avgPrice, shippingCost, qp.category || "General", admin);

        const rawVariants = typeof qp.variants === 'string' ? JSON.parse(qp.variants) : (qp.variants || []);
        const variants = rawVariants.map((v: any, i: number) => ({
          sku: generateSku("CJ", qp.cj_product_id, i),
          cj_sku: v.cjSku || v.vid || null,
          size: v.size || null,
          color: v.color || null,
          price_sar: pricing.retailSar,
          cost_usd: v.price || avgPrice,
          stock: Math.max(0, (v.stock || 0) - 5),
          weight_g: v.weight || null,
        }));

        const totalStock = variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);

        const rawImages = typeof qp.images === 'string' ? JSON.parse(qp.images) : (qp.images || []);

        const { data: newProduct, error: insertErr } = await admin
          .from("products")
          .insert({
            title: qp.name_en,
            title_ar: qp.name_ar || null,
            description: qp.description_en || null,
            description_ar: qp.description_ar || null,
            price: pricing.retailSar,
            compare_at_price: null,
            category: qp.category || "General",
            stock: totalStock,
            active: totalStock > 0,
            images: rawImages,
            video_url: qp.video_url || null,
            metadata: {
              cj_product_id: qp.cj_product_id,
              cj_sku: qp.cj_sku,
              variants: variants,
              cost_usd: avgPrice,
              shipping_usd: shippingCost,
              pricing_breakdown: pricing.breakdown,
              margin_applied: pricing.marginApplied,
              supplier_rating: qp.supplier_rating,
              processing_days: qp.processing_days,
              delivery_days_min: qp.delivery_days_min,
              delivery_days_max: qp.delivery_days_max,
              imported_at: new Date().toISOString(),
            },
          })
          .select("id")
          .single();

        if (insertErr || !newProduct) {
          throw new Error(insertErr?.message || "Failed to create product");
        }

        await admin
          .from('product_queue')
          .update({
            status: 'imported',
            shopixo_product_id: newProduct.id,
            imported_at: new Date().toISOString(),
            calculated_retail_sar: pricing.retailSar,
            margin_applied: pricing.marginApplied
          })
          .eq('id', qp.id);

        results.push({ id: qp.id, success: true, shopixoId: newProduct.id });

      } catch (e: any) {
        console.error(`Failed to import product ${qp.id}:`, e);
        results.push({ id: qp.id, success: false, error: e?.message || "Import failed" });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    try {
      await admin.from('import_logs').insert({
        action: "import_execute",
        status: failCount === 0 ? "success" : "partial",
        details: { 
          requested: productIds.length, 
          imported: successCount, 
          failed: failCount,
          results 
        }
      });
    } catch (logErr) {
      console.error("Failed to log import:", logErr);
    }

    return NextResponse.json({
      ok: true,
      imported: successCount,
      failed: failCount,
      results,
    });
  } catch (e: any) {
    console.error("Import execute error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    const { data: products, error } = await admin
      .from('product_queue')
      .select('id, name_en, cj_product_id')
      .eq('status', 'approved')
      .order('quality_score', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      products: products || [],
      total: products?.length || 0,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
