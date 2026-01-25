import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/utils/slug";
import { hasColumn, hasTable } from "@/lib/db-features";

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

async function ensureUniqueSlug(admin: any, base: string): Promise<string> {
  const s = slugify(base);
  let candidate = s;
  for (let i = 2; i <= 50; i++) {
    const { data } = await admin
      .from('products')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${s}-${i}`;
  }
  return `${s}-${Date.now()}`;
}

async function omitMissingColumns(payload: Record<string, any>, cols: string[]) {
  for (const c of cols) {
    if (!(c in payload)) continue;
    try {
      const exists = await hasColumn('products', c);
      if (!exists) delete payload[c];
    } catch {
      delete payload[c];
    }
  }
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

    const hasCjProductIdColumn = await hasColumn('products', 'cj_product_id');
    const hasVariantsTable = await hasTable('product_variants');

    const results: { id: number; success: boolean; shopixoId?: string; error?: string }[] = [];

    for (const qp of queueProducts) {
      try {
        let existing: any = null;
        if (hasCjProductIdColumn) {
          const { data } = await admin
            .from("products")
            .select("id")
            .eq("cj_product_id", qp.cj_product_id)
            .maybeSingle();
          existing = data;
        }

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
          weight_g: v.weight || v.weightGrams || null,
          image_url: v.imageUrl || v.image || v.whiteImage || null,
        }));

        const totalStock = variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
        const rawImages = typeof qp.images === 'string' ? JSON.parse(qp.images) : (qp.images || []);
        const baseSlug = await ensureUniqueSlug(admin, qp.name_en);

        const productPayload: Record<string, any> = {
          title: qp.name_en,
          slug: baseSlug,
          price: pricing.retailSar,
          category: qp.category || "General",
          stock: totalStock,
        };

        const optionalFields: Record<string, any> = {
          description: qp.description_en || '',
          images: rawImages,
          video_url: qp.video_url || null,
          is_active: totalStock > 0,
          cj_product_id: qp.cj_product_id,
          supplier_sku: qp.cj_sku || `CJ-${qp.cj_product_id}`,
          free_shipping: true,
          processing_time_hours: qp.processing_days ? qp.processing_days * 24 : null,
          delivery_time_hours: qp.delivery_days_max ? qp.delivery_days_max * 24 : null,
          variants: variants.length > 0 ? variants : null,
        };

        await omitMissingColumns(optionalFields, [
          'description', 'images', 'video_url', 'is_active', 'cj_product_id',
          'free_shipping', 'processing_time_hours', 'delivery_time_hours',
          'supplier_sku', 'variants'
        ]);

        const fullPayload = { ...productPayload, ...optionalFields };

        let productId: number;
        try {
          const { data: newProduct, error: insertErr } = await admin
            .from("products")
            .insert(fullPayload)
            .select("id")
            .single();

          if (insertErr || !newProduct) {
            throw insertErr || new Error("Failed to create product");
          }
          productId = newProduct.id as number;
        } catch (e: any) {
          const msg = String(e?.message || e || '');
          if (/duplicate key|unique constraint|unique violation|already exists/i.test(msg)) {
            fullPayload.slug = await ensureUniqueSlug(admin, qp.name_en + '-' + Date.now());
            const { data: newProduct2, error: err2 } = await admin
              .from("products")
              .insert(fullPayload)
              .select("id")
              .single();
            if (err2 || !newProduct2) throw err2 || new Error("Failed to create product (retry)");
            productId = newProduct2.id as number;
          } else {
            throw e;
          }
        }

        if (hasVariantsTable && variants.length > 0) {
          const variantRows = variants.map((v: any) => ({
            product_id: productId,
            option_name: v.size ? 'Size' : (v.color ? 'Color' : 'Default'),
            option_value: v.size || v.color || 'Default',
            cj_sku: v.cj_sku || null,
            price: v.price_sar,
            stock: v.stock,
          }));

          await admin.from('product_variants').insert(variantRows);
        }

        await admin
          .from('product_queue')
          .update({
            status: 'imported',
            shopixo_product_id: productId,
            imported_at: new Date().toISOString(),
            calculated_retail_sar: pricing.retailSar,
            margin_applied: pricing.marginApplied
          })
          .eq('id', qp.id);

        results.push({ id: qp.id, success: true, shopixoId: String(productId) });

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
