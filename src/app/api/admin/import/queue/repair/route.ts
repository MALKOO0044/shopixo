import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { ensureAdmin } from "@/lib/auth/admin-guard";
import { hasColumns } from "@/lib/db-features";
import { normalizeSizeList } from "@/lib/cj/size-normalization";
import { enhanceProductImageUrl } from "@/lib/media/image-quality";
import { sarToUsd } from "@/lib/pricing";
import type { PricedProduct } from "@/components/admin/import/preview/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FALLBACK_NAME_PREFIX = "unavailable cj product";
const FALLBACK_INVENTORY_MARKERS = [
  "fallback payload",
  "cj api did not return details",
  "cj_product_not_found_fallback",
  "product details not found in cj api",
];
const RECOVERY_NOTE_TAG = "[queue-repair]";

const QUEUE_REPAIR_COLUMNS = [
  "name_en",
  "cj_sku",
  "description_en",
  "overview",
  "product_info",
  "size_info",
  "product_note",
  "packing_list",
  "category",
  "category_name",
  "images",
  "variants",
  "variant_pricing",
  "cj_price_usd",
  "calculated_retail_sar",
  "margin_applied",
  "stock_total",
  "total_sales",
  "processing_days",
  "delivery_days_min",
  "delivery_days_max",
  "supplier_rating",
  "displayed_rating",
  "rating_confidence",
  "review_count",
  "available_sizes",
  "available_colors",
  "available_models",
  "size_chart_images",
  "material",
  "product_type",
  "origin_country",
  "hs_code",
  "color_image_map",
  "video_url",
  "video_source_url",
  "video_4k_url",
  "video_delivery_mode",
  "video_quality_gate_passed",
  "video_source_quality_hint",
  "has_video",
  "inventory_status",
  "inventory_error_message",
  "status",
  "admin_notes",
  "reviewed_at",
  "updated_at",
] as const;

type QueueRow = Record<string, any> & {
  id: number;
  cj_product_id: string;
  name_en?: string | null;
  inventory_error_message?: string | null;
  variants?: unknown;
  status?: string | null;
  admin_notes?: string | null;
  margin_applied?: number | null;
  profit_margin?: number | null;
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPositiveNumber(value: unknown): number | null {
  const parsed = toNumber(value);
  return parsed && parsed > 0 ? parsed : null;
}

function toNonNegativeInt(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed);
}

function text(value: unknown, maxLength = 1024): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";
  return normalized.slice(0, maxLength);
}

function parseArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return [];

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseObject(value: unknown): Record<string, string> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, string>;
  }

  if (typeof value !== "string") return {};

  const trimmed = value.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return {};

  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

function isFallbackVariantSignature(variantsValue: unknown): boolean {
  const variants = parseArray(variantsValue);
  if (variants.length === 0) return false;

  for (const variant of variants) {
    const error = text(variant?.error, 255).toLowerCase();
    const variantName = text(variant?.variantName, 255).toLowerCase();
    const logisticName = text(variant?.logisticName, 255).toLowerCase();

    if (error === "cj_product_not_found_fallback") return true;
    if (variantName === "fallback variant") return true;
    if (logisticName === "fallback") return true;
  }

  return false;
}

function isBrokenQueueRow(row: QueueRow): boolean {
  const status = text(row?.status, 50).toLowerCase();
  const adminNotes = text(row?.admin_notes, 4000).toLowerCase();
  if (status === "rejected" && adminNotes.includes(RECOVERY_NOTE_TAG)) return false;

  const name = text(row?.name_en, 500).toLowerCase();
  if (name.startsWith(FALLBACK_NAME_PREFIX)) return true;

  const inventoryMessage = text(row?.inventory_error_message, 4000).toLowerCase();
  if (FALLBACK_INVENTORY_MARKERS.some((marker) => inventoryMessage.includes(marker))) return true;

  return isFallbackVariantSignature(row?.variants);
}

function dedupeStringArray(values: unknown, maxItems = 50): string[] {
  const source = Array.isArray(values) ? values : [];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const item of source) {
    const normalized = text(item, 255);
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(normalized);

    if (out.length >= maxItems) break;
  }

  return out;
}

function normalizeGalleryImages(images: unknown, maxItems = 20): string[] {
  const source = Array.isArray(images) ? images : [];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const item of source) {
    if (typeof item !== "string") continue;
    const enhanced = enhanceProductImageUrl(item.trim(), "gallery");
    if (!/^https?:\/\//i.test(enhanced)) continue;

    const key = enhanced.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(enhanced);

    if (out.length >= maxItems) break;
  }

  return out;
}

function normalizeColorImageMap(value: unknown): Record<string, string> | null {
  const source = parseObject(value);
  const entries: Array<[string, string]> = [];

  for (const [rawColor, rawImage] of Object.entries(source)) {
    const color = text(rawColor, 120);
    if (!color) continue;

    const enhanced = enhanceProductImageUrl(text(rawImage, 2000), "gallery");
    if (!/^https?:\/\//i.test(enhanced)) continue;

    entries.push([color, enhanced]);
  }

  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

function normalizeVariant(variant: any, index: number): Record<string, any> | null {
  const variantSku = text(variant?.variantSku || variant?.sku || variant?.cjSku || variant?.vid, 255);
  if (!variantSku) return null;

  const variantId = text(variant?.variantId || `${variantSku}-${index + 1}`, 255);
  const variantPriceUSD = toPositiveNumber(variant?.variantPriceUSD ?? variant?.cost_usd ?? variant?.costPrice) ?? 0;
  const shippingPriceUSD = toPositiveNumber(variant?.shippingPriceUSD ?? variant?.shipping_usd ?? variant?.shippingCost) ?? 0;

  const sellPriceSAR =
    toPositiveNumber(variant?.sellPriceSAR ?? variant?.sellPriceSar ?? variant?.price_sar)
    ?? toPositiveNumber(variant?.price)
    ?? null;

  if (!sellPriceSAR) return null;

  const sellPriceUSD = toPositiveNumber(variant?.sellPriceUSD ?? variant?.sellPriceUsd ?? variant?.price_usd)
    ?? sarToUsd(sellPriceSAR);

  const cjStock = toNonNegativeInt(variant?.cjStock ?? variant?.cj_stock);
  const factoryStock = toNonNegativeInt(variant?.factoryStock ?? variant?.factory_stock);
  const inferredStock = cjStock + factoryStock;
  const stock = Math.max(toNonNegativeInt(variant?.stock ?? variant?.totalStock), inferredStock);

  return {
    ...variant,
    variantId,
    variantSku,
    variantPriceUSD,
    shippingPriceUSD,
    sellPriceSAR,
    sellPriceUSD,
    cjStock,
    factoryStock,
    stock,
    size: text(variant?.size, 120) || null,
    color: text(variant?.color, 120) || null,
    error: undefined,
  };
}

function normalizeVariants(variantsValue: unknown): Record<string, any>[] {
  const source = parseArray(variantsValue);
  const normalized: Record<string, any>[] = [];

  for (let index = 0; index < source.length; index++) {
    const variant = normalizeVariant(source[index], index);
    if (!variant) continue;
    normalized.push(variant);
  }

  return normalized;
}

function buildVariantPricing(variants: Record<string, any>[]): any[] {
  const out: any[] = [];

  for (const variant of variants) {
    const sellPriceSAR = toPositiveNumber(variant?.sellPriceSAR);
    if (!sellPriceSAR) continue;

    const sellPriceUSD = toPositiveNumber(variant?.sellPriceUSD) ?? sarToUsd(sellPriceSAR);
    const marginPercent = toNumber(variant?.marginPercent);

    out.push({
      variantId: text(variant?.variantId, 255) || null,
      sku: text(variant?.variantSku, 255) || null,
      color: text(variant?.color, 120) || null,
      size: text(variant?.size, 120) || null,
      colorImage: text(variant?.variantImage, 2000) || null,
      price: sellPriceSAR,
      priceUsd: sellPriceUSD,
      marginPercent: marginPercent && marginPercent > 0 ? marginPercent : null,
      costPrice: toPositiveNumber(variant?.variantPriceUSD) ?? null,
      shippingCost: toPositiveNumber(variant?.shippingPriceUSD) ?? null,
      stock: toNonNegativeInt(variant?.stock),
      cjStock: toNonNegativeInt(variant?.cjStock),
      factoryStock: toNonNegativeInt(variant?.factoryStock),
    });
  }

  return out;
}

function appendRecoveryNote(existing: unknown, note: string): string {
  const current = text(existing, 4000);
  if (!current) return note;
  if (current.includes(note)) return current;
  return `${current}\n${note}`.slice(0, 4000);
}

function pickAvailableFields(payload: Record<string, any>, available: Record<string, boolean>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (available[key]) out[key] = value;
  }
  return out;
}

async function fetchLiveProduct(req: NextRequest, pid: string, profitMargin: number): Promise<{ ok: true; product: PricedProduct } | { ok: false; error: string }> {
  const detailsUrl = new URL(`/api/admin/cj/products/${encodeURIComponent(pid)}/details`, req.url);
  detailsUrl.searchParams.set("profitMargin", String(profitMargin));
  detailsUrl.searchParams.set("allowMissingFallback", "0");

  const forwardedCookie = req.headers.get("cookie") || "";
  const response = await fetch(detailsUrl.toString(), {
    method: "GET",
    headers: {
      ...(forwardedCookie ? { cookie: forwardedCookie } : {}),
      "x-queue-repair": "1",
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.ok || !payload?.product) {
    return {
      ok: false,
      error: text(payload?.error, 500) || `HTTP ${response.status}`,
    };
  }

  return { ok: true, product: payload.product as PricedProduct };
}

export async function POST(req: NextRequest) {
  try {
    const guard = await ensureAdmin();
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: guard.reason }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        {
          ok: false,
          error: "Supabase admin environment missing. Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = Boolean(body?.dryRun);
    const limitRaw = Number(body?.limit);
    const offsetRaw = Number(body?.offset);
    const runtimeBudgetRaw = Number(body?.runtimeBudgetMs);

    const limit = Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(2000, Math.floor(limitRaw)))
      : 300;
    const offset = Number.isFinite(offsetRaw)
      ? Math.max(0, Math.floor(offsetRaw))
      : 0;

    const statuses = Array.isArray(body?.statuses)
      ? body.statuses.map((value: unknown) => text(value, 20).toLowerCase()).filter(Boolean)
      : ["pending", "approved", "rejected"];

    let query = supabase
      .from("product_queue")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (statuses.length > 0) {
      query = query.in("status", statuses);
    }

    const { data: rows, error: rowsError } = await query;
    if (rowsError) {
      return NextResponse.json({ ok: false, error: rowsError.message }, { status: 500 });
    }

    const scannedRows: QueueRow[] = Array.isArray(rows) ? (rows as QueueRow[]) : [];
    const brokenRows = scannedRows.filter(isBrokenQueueRow);

    const availableColumns = await hasColumns("product_queue", [...QUEUE_REPAIR_COLUMNS]);

    const repaired: Array<{ id: number; pid: string }> = [];
    const unrecoverable: Array<{ id: number; pid: string; reason: string }> = [];
    const failed: Array<{ id: number; pid: string; error: string }> = [];

    const startedAt = Date.now();
    const runtimeBudgetMs = Number.isFinite(runtimeBudgetRaw)
      ? Math.max(8_000, Math.min(55_000, Math.floor(runtimeBudgetRaw)))
      : 45_000;

    for (const row of brokenRows) {
      if (Date.now() - startedAt > runtimeBudgetMs) break;

      const pid = text(row?.cj_product_id, 255);
      if (!pid) {
        failed.push({ id: Number(row?.id || 0), pid: "", error: "Missing cj_product_id" });
        continue;
      }

      const margin =
        toPositiveNumber(row?.margin_applied)
        ?? toPositiveNumber(row?.profit_margin)
        ?? 8;

      const live = await fetchLiveProduct(req, pid, margin);
      const nowIso = new Date().toISOString();

      if (!live.ok) {
        const reason = `Unable to recover PID ${pid}: ${live.error}`;

        if (!dryRun) {
          const unrecoverableNote = appendRecoveryNote(
            row?.admin_notes,
            `${RECOVERY_NOTE_TAG} Marked unrecoverable during queue repair. ${reason}`
          );

          const rawUnrecoverablePayload: Record<string, any> = {
            status: "rejected",
            admin_notes: unrecoverableNote,
            reviewed_at: nowIso,
            inventory_status: "error",
            inventory_error_message: reason,
            updated_at: nowIso,
          };

          const unrecoverablePayload = pickAvailableFields(rawUnrecoverablePayload, availableColumns);
          const { error: updateError } = await supabase
            .from("product_queue")
            .update(unrecoverablePayload)
            .eq("id", row.id);

          if (updateError) {
            failed.push({ id: row.id, pid, error: updateError.message });
          } else {
            unrecoverable.push({ id: row.id, pid, reason });
          }
        } else {
          unrecoverable.push({ id: row.id, pid, reason });
        }

        continue;
      }

      const product = live.product;
      const normalizedVariants = normalizeVariants(product?.variants);
      if (normalizedVariants.length === 0) {
        failed.push({ id: row.id, pid, error: "Recovered product has no valid variants" });
        continue;
      }

      const variantPricing = buildVariantPricing(normalizedVariants);
      const imageList = normalizeGalleryImages(product?.images, 20);
      const normalizedSizes = normalizeSizeList(product?.availableSizes ?? [], { allowNumeric: false });

      const availableColors = dedupeStringArray(product?.availableColors ?? [], 30);
      const availableModels = dedupeStringArray(product?.availableModels ?? [], 30);
      const sizeChartImages = normalizeGalleryImages(product?.sizeChartImages ?? [], 15);
      const colorImageMap = normalizeColorImageMap(product?.colorImageMap);

      const variantCostUsdCandidates = normalizedVariants
        .map((variant) => toPositiveNumber(variant?.variantPriceUSD))
        .filter((value): value is number => Boolean(value));
      const minVariantCostUsd = variantCostUsdCandidates.length > 0 ? Math.min(...variantCostUsdCandidates) : null;
      const minProductCostUsd = toPositiveNumber(product?.minPriceUSD);

      const stockFromVariants = normalizedVariants.reduce((sum, variant) => sum + toNonNegativeInt(variant?.stock), 0);
      const processingDays = toPositiveNumber((product as any)?.processingDays)
        ?? (toPositiveNumber(product?.processingTimeHours) ? Math.ceil((toPositiveNumber(product?.processingTimeHours) as number) / 24) : null);
      const deliveryDaysMax = toPositiveNumber((product as any)?.deliveryDaysMax)
        ?? (toPositiveNumber(product?.deliveryTimeHours) ? Math.ceil((toPositiveNumber(product?.deliveryTimeHours) as number) / 24) : null);
      const deliveryDaysMin = toPositiveNumber((product as any)?.deliveryDaysMin) ?? null;

      const hasVideo = text(product?.videoUrl, 2000).length > 0;
      const recoveredNote = appendRecoveryNote(
        row?.admin_notes,
        `${RECOVERY_NOTE_TAG} Recovered from live CJ details at ${nowIso}.`
      );

      const rawPayload: Record<string, any> = {
        name_en: text(product?.name, 500) || text(row?.name_en, 500) || `CJ Product ${pid}`,
        cj_sku: text(product?.cjSku, 255) || text(row?.cj_sku, 255) || null,
        description_en: text(product?.description, 120000) || null,
        overview: text(product?.overview, 120000) || null,
        product_info: text((product as any)?.productInfo, 120000) || null,
        size_info: text((product as any)?.sizeInfo, 120000) || null,
        product_note: text((product as any)?.productNote, 120000) || null,
        packing_list: text((product as any)?.packingList, 120000) || null,
        category: text(product?.categoryName, 255) || text(row?.category, 255) || "General",
        category_name: text(product?.categoryName, 255) || null,
        images: imageList,
        variants: normalizedVariants,
        variant_pricing: variantPricing,
        cj_price_usd: minVariantCostUsd ?? minProductCostUsd ?? null,
        calculated_retail_sar: toPositiveNumber(product?.avgPriceSAR) ?? toPositiveNumber(product?.minPriceSAR) ?? null,
        margin_applied: toPositiveNumber(product?.profitMarginApplied) ?? toPositiveNumber(row?.margin_applied) ?? null,
        stock_total: Math.max(toNonNegativeInt(product?.stock), stockFromVariants),
        total_sales: toNonNegativeInt(product?.listedNum),
        processing_days: processingDays,
        delivery_days_min: deliveryDaysMin,
        delivery_days_max: deliveryDaysMax,
        supplier_rating: toPositiveNumber((product as any)?.rating) ?? null,
        displayed_rating: toPositiveNumber(product?.displayedRating) ?? null,
        rating_confidence: toPositiveNumber(product?.ratingConfidence) ?? null,
        review_count: toNonNegativeInt(product?.reviewCount),
        available_sizes: normalizedSizes.length > 0 ? normalizedSizes : null,
        available_colors: availableColors.length > 0 ? availableColors : null,
        available_models: availableModels.length > 0 ? availableModels : null,
        size_chart_images: sizeChartImages.length > 0 ? sizeChartImages : null,
        material: text(product?.material, 1000) || null,
        product_type: text(product?.productType, 500) || null,
        origin_country: text(product?.originCountry, 255) || null,
        hs_code: text(product?.hsCode, 255) || null,
        color_image_map: colorImageMap,
        video_url: text(product?.videoUrl, 2000) || null,
        video_source_url: text(product?.videoSourceUrl, 2000) || null,
        video_4k_url: text(product?.video4kUrl, 2000) || null,
        video_delivery_mode: text(product?.videoDeliveryMode, 50) || null,
        video_quality_gate_passed: typeof product?.videoQualityGatePassed === "boolean" ? product.videoQualityGatePassed : null,
        video_source_quality_hint: text(product?.videoSourceQualityHint, 50) || null,
        has_video: hasVideo,
        inventory_status: text(product?.inventoryStatus, 50) || "ok",
        inventory_error_message: text(product?.inventoryErrorMessage, 4000) || null,
        admin_notes: recoveredNote,
        updated_at: nowIso,
      };

      const payload = pickAvailableFields(rawPayload, availableColumns);

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from("product_queue")
          .update(payload)
          .eq("id", row.id);

        if (updateError) {
          failed.push({ id: row.id, pid, error: updateError.message });
          continue;
        }
      }

      repaired.push({ id: row.id, pid });
    }

    const processedCount = repaired.length + unrecoverable.length + failed.length;
    const stoppedEarly = processedCount < brokenRows.length;

    return NextResponse.json({
      ok: true,
      dryRun,
      scanned: scannedRows.length,
      candidates: brokenRows.length,
      processed: processedCount,
      repaired: repaired.length,
      unrecoverable: unrecoverable.length,
      failed: failed.length,
      stoppedEarly,
      nextOffset: stoppedEarly ? offset : offset + scannedRows.length,
      repairedRows: repaired.slice(0, 50),
      unrecoverableRows: unrecoverable.slice(0, 50),
      failedRows: failed.slice(0, 50),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Queue repair failed",
      },
      { status: 500 }
    );
  }
}
