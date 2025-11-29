import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/auth/admin-guard";
import { query, queryOne, execute } from "@/lib/db/replit-pg";

export async function POST(req: NextRequest) {
  try {
    const guard = await ensureAdmin();
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: guard.reason }, { status: 401 });
    }
    
    const body = await req.json();
    const { name, keywords, category, filters, products } = body;
    
    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ ok: false, error: "No products provided" }, { status: 400 });
    }

    // Create batch in Replit PostgreSQL
    const batch = await queryOne<{ id: number }>(
      `INSERT INTO import_batches (name, keywords, category, filters, status, products_found, products_approved, products_imported)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        name || `Import ${new Date().toISOString()}`,
        keywords || "",
        category || "General",
        JSON.stringify(filters || {}),
        "active",
        products.length,
        0,
        0
      ]
    );

    if (!batch) {
      console.error("Failed to create batch");
      return NextResponse.json({ ok: false, error: "Failed to create batch" }, { status: 500 });
    }

    // Insert products into queue
    let addedCount = 0;
    let failedCount = 0;
    const failedProducts: string[] = [];
    
    for (const p of products) {
      const avgPrice = p.variants?.length > 0
        ? p.variants.reduce((sum: number, v: any) => sum + (v.price || 0), 0) / p.variants.length
        : 0;
      const totalStock = p.variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || 0;
      const productId = p.pid || p.productId;

      try {
        await execute(
          `INSERT INTO product_queue (
            batch_id, cj_product_id, cj_sku, name_en, name_ar, description_en, description_ar,
            category, images, video_url, variants, cj_price_usd, shipping_cost_usd,
            calculated_retail_sar, margin_applied, supplier_rating, total_sales, stock_total,
            processing_days, delivery_days_min, delivery_days_max, quality_score, status,
            admin_notes, reviewed_by, reviewed_at, shopixo_product_id, imported_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
          )
          ON CONFLICT (cj_product_id) DO UPDATE SET
            batch_id = EXCLUDED.batch_id,
            name_en = EXCLUDED.name_en,
            variants = EXCLUDED.variants,
            cj_price_usd = EXCLUDED.cj_price_usd,
            stock_total = EXCLUDED.stock_total,
            status = 'pending',
            updated_at = NOW()`,
          [
            batch.id,
            productId,
            p.variants?.[0]?.cjSku || null,
            p.name || "Untitled",
            null, // name_ar
            p.description || null,
            null, // description_ar
            category || "General",
            JSON.stringify(p.images || []),
            p.videoUrl || null,
            JSON.stringify(p.variants || []),
            avgPrice,
            null, // shipping_cost_usd
            null, // calculated_retail_sar
            null, // margin_applied
            p.supplierRating || 4.0,
            p.totalSales || 0,
            totalStock,
            p.processingDays || 3,
            p.deliveryDaysMin || 7,
            p.deliveryDaysMax || 15,
            p.qualityScore || 0.75,
            "pending",
            null, // admin_notes
            null, // reviewed_by
            null, // reviewed_at
            null, // shopixo_product_id
            null  // imported_at
          ]
        );
        addedCount++;
      } catch (err: any) {
        failedCount++;
        failedProducts.push(productId);
        console.error("Failed to add product to queue:", productId, err?.message);
      }
    }
    
    // If all products failed, return error
    if (addedCount === 0 && products.length > 0) {
      return NextResponse.json({ 
        ok: false, 
        error: `Failed to add any products to queue. ${failedCount} products failed.`,
        failedProducts: failedProducts.slice(0, 10)
      }, { status: 500 });
    }

    // Log the action
    try {
      await execute(
        `INSERT INTO import_logs (batch_id, action, status, details)
         VALUES ($1, $2, $3, $4)`,
        [
          batch.id,
          "batch_created",
          "success",
          JSON.stringify({ products_count: products.length, keywords, category })
        ]
      );
    } catch (logErr) {
      console.error("Failed to log batch creation:", logErr);
    }

    return NextResponse.json({
      ok: true,
      batchId: batch.id,
      productsAdded: addedCount,
      productsFailed: failedCount,
      ...(failedCount > 0 && { warning: `${failedCount} products failed to add` }),
    });
  } catch (e: any) {
    console.error("Batch creation error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const batches = await query(
      `SELECT * FROM import_batches ORDER BY created_at DESC LIMIT 50`
    );

    return NextResponse.json({ ok: true, batches });
  } catch (e: any) {
    console.error("Failed to fetch batches:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
