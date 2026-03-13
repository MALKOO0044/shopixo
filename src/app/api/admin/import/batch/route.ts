import { NextRequest, NextResponse } from "next/server";



import { createClient } from "@supabase/supabase-js";



import { ensureAdmin } from "@/lib/auth/admin-guard";



import {



  isImportDbConfigured,



  testImportDbConnection,



  createImportBatch,



  addProductToQueue,



  logImportAction,



  getBatches,



  checkProductQueueSchema



} from "@/lib/db/import-db";



import { extractCjProductVideoUrl, normalizeCjVideoUrl } from "@/lib/cj/video";



import { build4kVideoDelivery, requiresVideoForMediaMode } from "@/lib/video/delivery";



import { normalizeSizeList } from "@/lib/cj/size-normalization";







export const runtime = 'nodejs';



export const dynamic = 'force-dynamic';

const TURBO_QUEUE_IMAGE_LIMIT = 3;

function getSupabaseAdminForTurbo() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function normalizeTurboText(value: unknown, maxLength: number): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";
  return normalized.slice(0, maxLength);
}

function normalizeTurboImages(images: unknown, fallbackImage?: unknown): string[] {
  const source = Array.isArray(images)
    ? images
    : (typeof fallbackImage === "string" && fallbackImage.trim().length > 0 ? [fallbackImage] : []);

  return source
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, TURBO_QUEUE_IMAGE_LIMIT);
}







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



    



    console.log('[Import Batch] Database connection verified, checking schema...');



    



    // Check if schema has all required columns



    const schemaCheck = await checkProductQueueSchema();



    if (!schemaCheck.ready) {



      console.warn('[Import Batch] Schema check reported missing columns; continuing with graceful write fallback:', schemaCheck.missingColumns);



    }



    



    console.log('[Import Batch] Schema verified, processing batch...');



    



    const body = await req.json();



    const { name, keywords, category, filters, products, mediaMode, mode } = body;

    const modeNormalized = String(mode || '').trim().toLowerCase();

    const turboMode = modeNormalized === 'turbo';



    const requiresVideo = requiresVideoForMediaMode(mediaMode);



    



    if (!products || !Array.isArray(products) || products.length === 0) {



      return NextResponse.json({ ok: false, error: "No products provided" }, { status: 400 });



    }

    if (turboMode) {
      const supabase = getSupabaseAdminForTurbo();
      if (!supabase) {
        return NextResponse.json({ ok: false, error: "Database connection failed" }, { status: 500 });
      }

      const batch = await createImportBatch({
        name: name || `Import ${new Date().toISOString()}`,
        keywords: keywords || "",
        category: category || "General",
        filters: filters || {},
        productsFound: products.length,
      });

      if (!batch) {
        return NextResponse.json({ ok: false, error: "Failed to create batch" }, { status: 500 });
      }

      const nowIso = new Date().toISOString();
      const turboRows: Record<string, any>[] = [];
      const failedProducts: string[] = [];
      const errorMessages: string[] = [];

      for (const product of products) {
        const productId = normalizeTurboText(product?.cjProductId || product?.pid || product?.productId, 255);
        const productNameRaw = normalizeTurboText(product?.name || product?.name_en, 500);
        const productName = productNameRaw || (productId ? `Untitled ${productId}`.slice(0, 500) : "");

        if (!productId) {
          failedProducts.push("(missing-pid)");
          continue;
        }

        const categoryName =
          normalizeTurboText(product?.categoryName || product?.category || category || "General", 255) || "General";
        const stockRaw = Number(product?.stockTotal ?? product?.stock ?? 0);
        const stockTotal = Number.isFinite(stockRaw) && stockRaw > 0 ? Math.floor(stockRaw) : 0;

        turboRows.push({
          batch_id: batch.id,
          cj_product_id: productId,
          cj_sku: normalizeTurboText(product?.cjSku, 255) || null,
          name_en: productName,
          category: categoryName,
          images: normalizeTurboImages(product?.images, product?.image),
          stock_total: stockTotal,
          status: "pending",
          updated_at: nowIso,
        });
      }

      if (turboRows.length === 0) {
        return NextResponse.json(
          {
            ok: false,
            error: "No valid products provided for turbo queue add",
            failedProducts: failedProducts.slice(0, 10),
          },
          { status: 400 }
        );
      }

      const turboChunkSize = Math.max(50, Math.min(500, Number(process.env.IMPORT_BATCH_TURBO_CHUNK_SIZE || 300)));
      const turboRowParallelism = Math.max(1, Math.min(24, Number(process.env.IMPORT_BATCH_TURBO_ROW_PARALLELISM || 16)));

      let addedCount = 0;
      let failedCount = failedProducts.length;

      for (let index = 0; index < turboRows.length; index += turboChunkSize) {
        const chunk = turboRows.slice(index, index + turboChunkSize);
        const { error: chunkError } = await supabase
          .from("product_queue")
          .upsert(chunk, { onConflict: "cj_product_id" });

        if (!chunkError) {
          addedCount += chunk.length;
          continue;
        }

        console.warn("[Import Batch] Turbo chunk upsert failed, retrying per-row for failed chunk:", chunkError.message);

        for (let rowIndex = 0; rowIndex < chunk.length; rowIndex += turboRowParallelism) {
          const rowSlice = chunk.slice(rowIndex, rowIndex + turboRowParallelism);
          const rowOutcomes = await Promise.all(
            rowSlice.map(async (row) => {
              const { error: rowError } = await supabase
                .from("product_queue")
                .upsert(row, { onConflict: "cj_product_id" });

              return { row, rowError };
            })
          );

          for (const outcome of rowOutcomes) {
            if (outcome.rowError) {
              failedCount++;
              failedProducts.push(String(outcome.row?.cj_product_id || "unknown-product"));
              if (errorMessages.length < 3) errorMessages.push(outcome.rowError.message);
            } else {
              addedCount++;
            }
          }
        }
      }

      if (addedCount === 0) {
        const firstError = errorMessages.length > 0 ? ` First error: ${errorMessages[0]}` : "";
        return NextResponse.json(
          {
            ok: false,
            error: `Failed to add any products to queue in turbo mode. ${failedCount} products failed.${firstError}`,
            failedProducts: failedProducts.slice(0, 10),
            errorDetails: errorMessages,
            mode: "turbo",
          },
          { status: 500 }
        );
      }

      try {
        await logImportAction(batch.id, "batch_created_turbo", "success", {
          products_count: products.length,
          products_added: addedCount,
          products_failed: failedCount,
          mode: "turbo",
          media_mode: mediaMode || "any",
          category,
        });
      } catch (logError) {
        console.warn("[Import Batch] Turbo log write failed (non-fatal):", logError);
      }

      return NextResponse.json({
        ok: true,
        batchId: batch.id,
        mode: "turbo",
        productsAdded: addedCount,
        productsFailed: failedCount,
        ...(failedCount > 0 && { warning: `${failedCount} products failed to add` }),
      });
    }







    const missingRequired: string[] = [];



    for (const p of products) {



      if (!p?.pid && !p?.cjProductId && !p?.productId) missingRequired.push(`pid`);



      if (!p?.name) missingRequired.push(`name`);



      if (!Array.isArray(p?.variants) || p.variants.length === 0) {



        missingRequired.push(`variants`);



      } else {



        for (const v of p.variants) {



          if (!v?.variantSku) missingRequired.push(`variantSku`);



          if (v?.sellPriceSAR == null) missingRequired.push(`sellPriceSAR`);



        }



      }



      if (missingRequired.length > 0) break;



    }



    if (missingRequired.length > 0) {



      return NextResponse.json({ ok: false, error: `Missing required fields: ${missingRequired.join(', ')}` }, { status: 400 });



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



    let skippedMissingVideoCount = 0;



    let skippedVideoQualityGateCount = 0;



    const failedProducts: string[] = [];



    const errorMessages: string[] = [];



    



    const processProduct = async (p: any): Promise<{

      success: boolean;

      productId: string;

      error?: string;

      skippedMissingVideo?: boolean;

      skippedVideoQualityGate?: boolean;

    }> => {



      let avgPrice = p.avgPriceSAR || 0;



      if (!avgPrice && p.variants?.length > 0) {



        avgPrice = p.variants.reduce((sum: number, v: any) => sum + (v.price || v.variantSellPrice || 0), 0) / p.variants.length;



      }







      let totalStock = p.stock || 0;



      if (!totalStock && p.variants?.length > 0) {



        totalStock = p.variants.reduce((sum: number, v: any) => sum + (v.stock || v.variantQuantity || 0), 0);



      }







      const productId = String(p.cjProductId || p.pid || p.productId || 'unknown-product');



      



      // Handle images - could be array or single image



      let images: string[] = [];



      if (Array.isArray(p.images)) {



        images = p.images;



      } else if (p.image) {



        images = [p.image];



      }







      const extractedVideoUrl = extractCjProductVideoUrl(p);



      const fallbackVideoUrl = normalizeCjVideoUrl(p?.videoUrl || p?.video || p?.productVideo);



      const videoUrl = extractedVideoUrl || fallbackVideoUrl || undefined;



      const videoDelivery = build4kVideoDelivery(videoUrl);



      const deliverableVideoUrl = videoDelivery.qualityGatePassed ? videoDelivery.deliveryUrl : undefined;







      if (requiresVideo && !videoDelivery.deliveryUrl) {



        return {



          success: false,



          productId,



          skippedMissingVideo: true,



          error: `Skipped product ${productId}: missing video for mediaMode=${String(mediaMode || 'unknown')}`,



        };



      }







      if (requiresVideo && !videoDelivery.qualityGatePassed) {



        return {



          success: false,



          productId,



          skippedVideoQualityGate: true,



          error: `Skipped product ${productId}: video quality gate failed (mode=${videoDelivery.mode}, sourceHint=${videoDelivery.sourceQualityHint}).`,



        };



      }







      // Keep queue payload canonical so review/import steps see one normalized size set.



      const normalizedAvailableSizes = Array.isArray(p.availableSizes)



        ? normalizeSizeList(p.availableSizes, { allowNumeric: false })



        : undefined;







      const result = await addProductToQueue(batch.id, {



        productId,



        cjSku: p.cjSku || undefined,



        storeSku: p.storeSku || undefined,



        name: p.name || undefined,



        description: p.description || undefined,



        overview: p.overview || undefined,



        productInfo: p.productInfo || undefined,



        sizeInfo: p.sizeInfo || undefined,



        productNote: p.productNote || undefined,



        packingList: p.packingList || undefined,



        category: p.categoryName || category || "General",



        images,



        videoUrl: deliverableVideoUrl,



        videoSourceUrl: videoDelivery.sourceUrl,



        video4kUrl: deliverableVideoUrl,



        videoDeliveryMode: videoDelivery.mode,



        videoQualityGatePassed: videoDelivery.qualityGatePassed,



        videoSourceQualityHint: videoDelivery.sourceQualityHint,



        mediaMode: typeof mediaMode === 'string' ? mediaMode : (p.mediaMode || p.media || undefined),



        variants: p.variants || [],



        avgPrice,



        supplierRating: Number.isFinite(Number(p.supplierRating ?? p.rating))



          ? Number(p.supplierRating ?? p.rating)



          : undefined,



        reviewCount: Number.isFinite(Number(p.reviewCount))



          ? Math.max(0, Math.floor(Number(p.reviewCount)))



          : undefined,



        displayedRating: typeof p.displayedRating === 'number' ? p.displayedRating : undefined,



        ratingConfidence: typeof p.ratingConfidence === 'number' ? p.ratingConfidence : undefined,



        totalStock,



        processingDays: p.processingDays ?? undefined,



        deliveryDaysMin: p.deliveryDaysMin ?? undefined,



        deliveryDaysMax: p.deliveryDaysMax ?? undefined,



        qualityScore: p.qualityScore ?? undefined,



        weightG: p.productWeight || undefined,



        packLength: p.packLength || undefined,



        packWidth: p.packWidth || undefined,



        packHeight: p.packHeight || undefined,



        material: p.material || undefined,



        productType: p.productType || undefined,



        originCountry: p.originCountry || undefined,



        hsCode: p.hsCode || undefined,



        sizeChartImages: p.sizeChartImages || undefined,



        availableSizes: normalizedAvailableSizes,



        availableColors: p.availableColors || undefined,



        availableModels: p.availableModels || undefined,



        categoryName: p.categoryName || undefined,



        cjCategoryId: p.cjCategoryId || undefined,



        supabaseCategoryId: p.supabaseCategoryId || undefined,



        supabaseCategorySlug: p.supabaseCategorySlug || undefined,



        variantPricing: p.variantPricing || [],



        sizeChartData: p.sizeChartData || undefined,



        specifications: p.specifications || undefined,



        sellingPoints: p.sellingPoints || undefined,



        inventoryByWarehouse: p.inventoryByWarehouse || p.inventory || undefined,



        inventoryStatus: p.inventoryStatus || undefined,



        inventoryErrorMessage: p.inventoryErrorMessage || undefined,



        priceBreakdown: p.priceBreakdown || undefined,



        colorImageMap: p.colorImageMap || undefined,



        cjTotalCost: p.cjTotalCost || undefined,



        cjShippingCost: p.cjShippingCost || undefined,



        cjProductCost: p.cjProductCost || undefined,



        profitMargin: p.profitMargin || undefined,



      }, {



        schemaCheck,



      });







      if (result.success) {



        return {



          success: true,



          productId,



        };



      } else {



        return {



          success: false,



          productId,



          error: result.error,



        };



      }



    };







    const parallelInsertWorkers = Math.max(



      1,



      Math.min(12, Number(process.env.IMPORT_BATCH_PARALLELISM || 8))



    );







    for (let index = 0; index < products.length; index += parallelInsertWorkers) {



      const chunk = products.slice(index, index + parallelInsertWorkers);



      const outcomes = await Promise.all(chunk.map((product) => processProduct(product)));







      for (const outcome of outcomes) {



        if (outcome.success) {



          addedCount++;



          continue;



        }







        failedCount++;



        failedProducts.push(outcome.productId);







        if (outcome.skippedMissingVideo) {



          skippedMissingVideoCount++;



        }



        if (outcome.skippedVideoQualityGate) {



          skippedVideoQualityGateCount++;



        }







        if (outcome.error && errorMessages.length < 3) {



          errorMessages.push(outcome.error);



        }



      }



    }



    



    if (addedCount === 0 && products.length > 0) {



      const errorDetail = errorMessages.length > 0 



        ? ` First error: ${errorMessages[0]}`



        : '';



      const mediaDetail = skippedMissingVideoCount > 0



        ? ` ${skippedMissingVideoCount} products were excluded because media mode requires video.`



        : '';



      const qualityDetail = skippedVideoQualityGateCount > 0



        ? ` ${skippedVideoQualityGateCount} products were excluded because video failed strict 4K quality gate.`



        : '';



      return NextResponse.json({ 



        ok: false, 



        error: `Failed to add any products to queue. ${failedCount} products failed.${mediaDetail}${qualityDetail}${errorDetail}`,



        failedProducts: failedProducts.slice(0, 10),



        errorDetails: errorMessages,



        skippedMissingVideo: skippedMissingVideoCount,



        skippedVideoQualityGate: skippedVideoQualityGateCount,



      }, { status: 500 });



    }







    await logImportAction(batch.id, "batch_created", "success", { 



      products_count: products.length, 



      media_mode: mediaMode || 'any',



      requires_video: requiresVideo,



      skipped_missing_video: skippedMissingVideoCount,



      skipped_video_quality_gate: skippedVideoQualityGateCount,



      keywords, 



      category 



    });







    return NextResponse.json({



      ok: true,



      batchId: batch.id,



      productsAdded: addedCount,



      productsFailed: failedCount,



      productsSkippedMissingVideo: skippedMissingVideoCount,



      productsSkippedVideoQualityGate: skippedVideoQualityGateCount,



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



