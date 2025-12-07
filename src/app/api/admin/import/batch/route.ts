import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/auth/admin-guard";
import { 
  isImportDbConfigured, 
  testImportDbConnection, 
  createImportBatch, 
  addProductToQueue, 
  logImportAction,
  getBatches 
} from "@/lib/db/import-db";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  console.log('[Import Batch] POST request received');
  try {
    const guard = await ensureAdmin();
    console.log('[Import Batch] Admin guard result:', guard.ok ? 'authenticated' : guard.reason);
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: guard.reason }, { status: 401 });
    }
    
    if (!isImportDbConfigured()) {
      console.error('[Import Batch] Supabase not configured');
      return NextResponse.json({ ok: false, error: "Database not configured. Please contact support." }, { status: 500 });
    }
    
    console.log('[Import Batch] Database configured, testing connection...');
    const connTest = await testImportDbConnection();
    if (!connTest.ok) {
      console.error('[Import Batch] Database connection test failed:', connTest.error);
      return NextResponse.json({ ok: false, error: connTest.error || "Database connection failed" }, { status: 500 });
    }
    
    console.log('[Import Batch] Database connection verified, processing batch...');
    
    const body = await req.json();
    const { name, keywords, category, filters, products } = body;
    
    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ ok: false, error: "No products provided" }, { status: 400 });
    }

    const batch = await createImportBatch({
      name: name || `Import ${new Date().toISOString()}`,
      keywords: keywords || "",
      category: category || "General",
      filters: filters || {},
      productsFound: products.length,
    });

    if (!batch) {
      console.error("Failed to create batch");
      return NextResponse.json({ ok: false, error: "Failed to create batch" }, { status: 500 });
    }

    let addedCount = 0;
    let failedCount = 0;
    const failedProducts: string[] = [];
    
    for (const p of products) {
      const avgPrice = p.variants?.length > 0
        ? p.variants.reduce((sum: number, v: any) => sum + (v.price || 0), 0) / p.variants.length
        : 0;
      const totalStock = p.variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || 0;
      const productId = p.pid || p.productId;

      const success = await addProductToQueue(batch.id, {
        productId,
        cjSku: p.cjSku || p.variants?.[0]?.cjSku || undefined,
        name: p.name || "Untitled",
        description: p.description || undefined,
        category: category || "General",
        images: p.images || [],
        videoUrl: p.videoUrl || undefined,
        variants: p.variants || [],
        avgPrice,
        supplierRating: p.supplierRating || 4.0,
        totalSales: p.totalSales || 0,
        totalStock,
        processingDays: p.processingDays || 3,
        deliveryDaysMin: p.deliveryDaysMin || 7,
        deliveryDaysMax: p.deliveryDaysMax || 15,
        qualityScore: p.qualityScore || 0.75,
      });

      if (success) {
        addedCount++;
      } else {
        failedCount++;
        failedProducts.push(productId);
      }
    }
    
    if (addedCount === 0 && products.length > 0) {
      return NextResponse.json({ 
        ok: false, 
        error: `Failed to add any products to queue. ${failedCount} products failed.`,
        failedProducts: failedProducts.slice(0, 10)
      }, { status: 500 });
    }

    await logImportAction(batch.id, "batch_created", "success", { 
      products_count: products.length, 
      keywords, 
      category 
    });

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
    const batches = await getBatches(50);
    return NextResponse.json({ ok: true, batches });
  } catch (e: any) {
    console.error("Failed to fetch batches:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
