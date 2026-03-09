import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/utils/slug";
import { hasColumn, hasTable } from "@/lib/db-features";
import { linkProductToMultipleCategories } from "@/lib/category-intelligence";
import { computeRating } from "@/lib/rating/engine";
import { sarToUsd } from "@/lib/pricing";
import { normalizeCjImageKey } from "@/lib/cj/image-gallery";
import { normalizeSingleSize, normalizeSizeList } from "@/lib/cj/size-normalization";
import { requiresVideoForMediaMode } from "@/lib/video/delivery";
import { enhanceProductImageUrl } from "@/lib/media/image-quality";

type LinkCategoryContext = {
  hasProductCategories: boolean;
  hasCategories: boolean;
  hasCjLinks: boolean;
  categoryByIdCache?: Map<number, any | null>;
};

// Helper to find category by name/slug/CJ-link and link product to category hierarchy
async function linkProductToCategory(
  admin: any,
  productId: number,
  categoryName: string,
  cjCategoryId?: string,
  supabaseCategoryId?: number,
  context?: LinkCategoryContext
): Promise<boolean> {
  try {
    const hasProductCategories = context?.hasProductCategories ?? await hasTable('product_categories').catch(() => false);
    const hasCategories = context?.hasCategories ?? await hasTable('categories').catch(() => false);
    
    if (!hasProductCategories || !hasCategories) {
      return false;
    }

    let category: any = null;
    
    // 0. BEST: Direct Supabase category ID (passed from discovery with Features selection)
    if (supabaseCategoryId && supabaseCategoryId > 0) {
      if (context?.categoryByIdCache?.has(supabaseCategoryId)) {
        category = context.categoryByIdCache.get(supabaseCategoryId) ?? null;
      } else {
        const { data: directMatch } = await admin
          .from('categories')
          .select('id, name, parent_id, slug')
          .eq('id', supabaseCategoryId)
          .maybeSingle();

        if (context?.categoryByIdCache) {
          context.categoryByIdCache.set(supabaseCategoryId, directMatch ?? null);
        }

        if (directMatch) {
          category = directMatch;
          console.log(`[Import] ✓ Direct Supabase category match: ${directMatch.name} (id: ${directMatch.id})`);
        }
      }
    }
    
    // 1. Try CJ category ID lookup via cj_category_links table
    if (!category && cjCategoryId) {
      const hasCjLinks = context?.hasCjLinks ?? await hasTable('cj_category_links').catch(() => false);
      if (hasCjLinks) {
        const { data: cjLink } = await admin
          .from('cj_category_links')
          .select('local_category_id')
          .eq('cj_category_id', cjCategoryId)
          .maybeSingle();
        
        if (cjLink?.local_category_id) {
          const { data: linkedCat } = await admin
            .from('categories')
            .select('id, name, parent_id, slug')
            .eq('id', cjLink.local_category_id)
            .maybeSingle();
          
          if (linkedCat) {
            category = linkedCat;
            console.log(`[Import] Found category via CJ link: ${linkedCat.name}`);
          }
        }
      }
    }

    // 2. Try exact name match
    if (!category && categoryName) {
      const { data: exactMatch } = await admin
        .from('categories')
        .select('id, name, parent_id, slug')
        .ilike('name', categoryName)
        .maybeSingle();
      
      if (exactMatch) {
        category = exactMatch;
      }
    }
    
    // 3. Try slug match
    if (!category && categoryName) {
      const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const { data: slugMatch } = await admin
        .from('categories')
        .select('id, name, parent_id, slug')
        .eq('slug', slug)
        .maybeSingle();
      
      if (slugMatch) {
        category = slugMatch;
      }
    }
    
    // 4. Try partial name match (last part after " > " or " - ")
    if (!category && categoryName) {
      const parts = categoryName.split(/\s*[->\s]+\s*/);
      const lastPart = parts[parts.length - 1].trim();
      if (lastPart && lastPart !== categoryName) {
        const { data: partialMatch } = await admin
          .from('categories')
          .select('id, name, parent_id, slug')
          .ilike('name', lastPart)
          .maybeSingle();
        
        if (partialMatch) {
          category = partialMatch;
        }
      }
    }
    
    // 5. Try fuzzy search on category name containing keywords
    if (!category) {
      const keywords = categoryName.split(/[\s,&-]+/).filter(k => k.length > 3);
      for (const keyword of keywords) {
        const { data: fuzzyMatch } = await admin
          .from('categories')
          .select('id, name, parent_id, slug')
          .ilike('name', `%${keyword}%`)
          .limit(1)
          .maybeSingle();
        
        if (fuzzyMatch) {
          category = fuzzyMatch;
          console.log(`[Import] Found category via fuzzy match "${keyword}": ${fuzzyMatch.name}`);
          break;
        }
      }
    }
    
    if (!category) {
      console.log(`[Import] Could not find category for: ${categoryName}`);
      return false;
    }

    // Delete existing product-category links for this product
    await admin.from('product_categories').delete().eq('product_id', productId);

    // Insert the leaf category link (primary)
    await admin.from('product_categories').insert({
      product_id: productId,
      category_id: category.id,
      is_primary: true
    });

    // Link to parent category (level 2)
    if (category.parent_id) {
      try {
        await admin.from('product_categories').insert({
          product_id: productId,
          category_id: category.parent_id,
          is_primary: false
        });
      } catch {} // Ignore duplicate constraint errors

      // Get grandparent (level 1) and link to it too
      const { data: parent } = await admin
        .from('categories')
        .select('parent_id')
        .eq('id', category.parent_id)
        .maybeSingle();
      
      if (parent?.parent_id) {
        try {
          await admin.from('product_categories').insert({
            product_id: productId,
            category_id: parent.parent_id,
            is_primary: false
          });
        } catch {} // Ignore duplicate constraint errors
      }
    }

    console.log(`[Import] Linked product ${productId} to category ${category.name} (id: ${category.id})`);
    return true;
  } catch (e: any) {
    console.error('[Import] Category linking error:', e?.message || e);
    return false;
  }
}

function getSupabaseAdmin() {
  const url = readEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = readEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key);
}

function readEnv(name: string): string | undefined {
  const env = (globalThis as any)?.process?.env;
  const value = env?.[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

const DEFAULT_SHIPPING_USD = 5;
const DEFAULT_PAYMENT_FEE_PERCENT = 2.9;
const DEFAULT_MARGIN_PERCENT = 40;
const DEFAULT_MIN_PROFIT_USD = 10;
const IMPORT_NON_PRODUCT_IMAGE_RE = /(sprite|icon|favicon|logo|placeholder|blank|loading|alipay|wechat|whatsapp|kefu|service|avatar|thumb|thumbnail|small|tiny|mini|sizechart|size\s*chart|chart|table|guide|tips|hot|badge|flag|promo|banner|sale|discount|qr)/i;
const IMPORT_INLINE_SIZE_TOKEN_RE = /[_-](\d{2,4})x(\d{2,4})(?=(?:\.|[_?&#]))/i;

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
    min_profit_usd: DEFAULT_MIN_PROFIT_USD,
    payment_fee_percent: DEFAULT_PAYMENT_FEE_PERCENT,
    smart_rounding_enabled: true,
    rounding_targets: [9.99, 14.99, 19.99, 24.99, 29.99, 39.99, 49.99, 59.99, 79.99, 99.99],
  };

  const paymentFeePercent = pricingRule.payment_fee_percent ?? DEFAULT_PAYMENT_FEE_PERCENT;
  const marginPercent = pricingRule.margin_percent ?? DEFAULT_MARGIN_PERCENT;
  const minProfitUsd = pricingRule.min_profit_usd ?? pricingRule.min_profit_sar ?? DEFAULT_MIN_PROFIT_USD;

  const effectiveShippingUsd = shippingUsd ?? DEFAULT_SHIPPING_USD;

  const subtotal = costUsd + effectiveShippingUsd;
  const paymentFee = subtotal * (paymentFeePercent / 100);
  const landed = subtotal + paymentFee;
  const margin = landed * (marginPercent / 100);
  let retailUsd = landed + margin;

  if (pricingRule.smart_rounding_enabled && pricingRule.rounding_targets?.length > 0) {
    const targets = (pricingRule.rounding_targets as number[]).sort((a, b) => a - b);
    const closest = targets.find(t => t >= retailUsd) || targets[targets.length - 1];
    retailUsd = closest;
  } else {
    retailUsd = Math.ceil(retailUsd * 100) / 100;
  }

  const profit = retailUsd - landed;
  if (profit < minProfitUsd) {
    retailUsd = landed + minProfitUsd;
    if (pricingRule.smart_rounding_enabled && pricingRule.rounding_targets?.length > 0) {
      const targets = (pricingRule.rounding_targets as number[]).sort((a, b) => a - b);
      const closest = targets.find(t => t >= retailUsd) || targets[targets.length - 1];
      retailUsd = closest;
    }
  }

  return {
    retailSar: Math.round(retailUsd * 100) / 100,
    marginApplied: marginPercent,
    breakdown: {
      costUsd,
      shippingUsd: effectiveShippingUsd,
      paymentFee,
      margin,
      landed,
      paymentFeePercent,
    },
  };
}

// Preview is the source of truth; do not modify fields during import.

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

type ColumnExistsResolver = (tableName: string, columnName: string) => Promise<boolean>;

async function omitMissingColumns(
  payload: Record<string, any>,
  tableName: string,
  cols: string[],
  hasColumnResolver: ColumnExistsResolver
) {
  for (const c of cols) {
    if (!(c in payload)) continue;
    try {
      const exists = await hasColumnResolver(tableName, c);
      if (!exists) delete payload[c];
    } catch {
      delete payload[c];
    }
  }
}

function requireField(value: any, name: string) {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
    throw new Error(`Missing required field: ${name}`);
  }
}

function normalizeColorKey(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function resolveColorImageForColor(colorValue: unknown, colorMap: Record<string, string>): string | null {
  const color = String(colorValue ?? '').trim();
  if (!color || !colorMap || Object.keys(colorMap).length === 0) return null;

  const exact = colorMap[color];
  if (typeof exact === 'string' && exact) return exact;

  const target = normalizeColorKey(color);
  if (!target) return null;

  for (const [mapColor, imageUrl] of Object.entries(colorMap)) {
    if (!imageUrl) continue;
    const key = normalizeColorKey(mapColor);
    if (!key) continue;
    if (key === target || key.includes(target) || target.includes(key)) {
      return imageUrl;
    }
  }

  return null;
}

function alignColorImageMapToColors(
  availableColors: string[] | null,
  colorMap: Record<string, string>
): Record<string, string> {
  if (!colorMap || Object.keys(colorMap).length === 0) return {};
  if (!Array.isArray(availableColors) || availableColors.length === 0) return colorMap;

  const aligned: Record<string, string> = {};
  for (const color of availableColors) {
    const resolved = resolveColorImageForColor(color, colorMap);
    if (resolved) aligned[color] = resolved;
  }

  for (const [k, v] of Object.entries(colorMap)) {
    if (!v) continue;
    if (!aligned[k]) aligned[k] = v;
  }

  return aligned;
}

function parseJsonMaybe(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function parseStringArrayOrNull(value: unknown): string[] | null {
  const parsed = parseJsonMaybe(value);
  return Array.isArray(parsed) ? (parsed as string[]) : null;
}

function normalizeImportAvailableSizes(value: unknown): string[] | null {
  const parsed = parseStringArrayOrNull(value);
  if (!parsed || parsed.length === 0) return null;
  const normalized = normalizeSizeList(parsed, { allowNumeric: false });
  return normalized.length > 0 ? normalized : null;
}

function normalizeImportVariantSize(value: unknown): string | null {
  const normalized = normalizeSingleSize(value, { allowNumeric: false });
  if (normalized) return normalized;
  const fallback = String(value ?? '').trim();
  return fallback || null;
}

function parseArrayOrEmpty(value: unknown): any[] {
  const parsed = parseJsonMaybe(value);
  return Array.isArray(parsed) ? parsed : [];
}

function sanitizeQueueGalleryImages(candidates: unknown[], maxImages: number = 50): string[] {
  const filtered: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const cleaned = candidate.trim();
    if (!cleaned) continue;

    const enhanced = enhanceProductImageUrl(cleaned, 'gallery');
    if (!/^https?:\/\//i.test(enhanced)) continue;

    const key = normalizeCjImageKey(enhanced);
    if (!key || seen.has(key)) continue;

    seen.add(key);
    filtered.push(enhanced);
    if (filtered.length >= maxImages) break;
  }

  return filtered;
}

function isLikelyTinyImportImage(url: string): boolean {
  const sizeToken = url.match(IMPORT_INLINE_SIZE_TOKEN_RE);
  if (sizeToken) {
    const width = Number(sizeToken[1]);
    const height = Number(sizeToken[2]);
    if (Number.isFinite(width) && Number.isFinite(height) && Math.max(width, height) < 320) {
      return true;
    }
  }

  const querySizes = Array.from(url.matchAll(/[?&](?:w|width|h|height)=(\d{2,4})/gi))
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value));
  if (querySizes.length > 0 && Math.max(...querySizes) < 320) {
    return true;
  }

  return false;
}

function sanitizeImportProductImages(candidates: unknown[], maxImages: number = 50): string[] {
  const normalizedCandidates: string[] = [];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const cleaned = candidate.trim();
    if (!cleaned) continue;

    try {
      const parsed = new URL(cleaned);
      parsed.hash = '';
      normalizedCandidates.push(enhanceProductImageUrl(parsed.toString(), 'gallery'));
    } catch {
      normalizedCandidates.push(enhanceProductImageUrl(cleaned, 'gallery'));
    }
  }

  const buildFiltered = (skipTinyFilter: boolean): string[] => {
    const filtered: string[] = [];
    const seen = new Set<string>();

    for (const candidate of normalizedCandidates) {
      if (!/^https?:\/\//i.test(candidate)) continue;
      if (IMPORT_NON_PRODUCT_IMAGE_RE.test(candidate)) continue;
      if (!skipTinyFilter && isLikelyTinyImportImage(candidate)) continue;

      const key = normalizeCjImageKey(candidate);
      if (!key || seen.has(key)) continue;

      seen.add(key);
      filtered.push(candidate);
      if (filtered.length >= maxImages) break;
    }

    return filtered;
  };

  const strictFiltered = buildFiltered(false);
  if (strictFiltered.length > 0) {
    return strictFiltered.slice(0, maxImages);
  }

  const fallbackFiltered = buildFiltered(true);
  return fallbackFiltered.slice(0, maxImages);
}

function parseObjectOrEmpty(value: unknown): Record<string, any> {
  const parsed = parseJsonMaybe(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return parsed as Record<string, any>;
}

function parseColorImageMap(value: unknown): Record<string, string> {
  const parsed = parseJsonMaybe(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

  const normalized: Record<string, string> = {};
  for (const [key, url] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof url === 'string' && url) {
      const enhanced = enhanceProductImageUrl(url, 'gallery');
      if (/^https?:\/\//i.test(enhanced)) {
        normalized[key] = enhanced;
      }
    }
  }
  return normalized;
}

function toPositiveNumberOrNull(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function normalizeImportedRatingValue(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.max(0, Math.min(5, n));
}

function normalizeImportedReviewCount(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

function normalizeImportedRatingConfidence(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.max(0.05, Math.min(1, n));
}

function normalizeVariantToken(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function isVariantPricingMatch(variant: any, pricingRow: any): boolean {
  const variantId = normalizeVariantToken(variant?.variantId || variant?.vid);
  const pricingVariantId = normalizeVariantToken(pricingRow?.variantId || pricingRow?.vid);
  if (variantId && pricingVariantId && variantId === pricingVariantId) return true;

  const variantSku = normalizeVariantToken(variant?.variantSku || variant?.cjSku);
  const pricingSku = normalizeVariantToken(pricingRow?.sku || pricingRow?.variantSku || pricingRow?.cjSku);
  if (variantSku && pricingSku && variantSku === pricingSku) return true;

  return false;
}

const FIDELITY_PARITY_FIELDS = [
  'store_sku',
  'description',
  'overview',
  'product_info',
  'size_info',
  'product_note',
  'packing_list',
  'supplier_rating',
  'review_count',
  'available_colors',
  'available_sizes',
  'color_image_map',
] as const;

type FidelityParityField = (typeof FIDELITY_PARITY_FIELDS)[number];

const OPTIONAL_IMPORT_FIDELITY_COLUMNS = new Set<string>(['supplier_rating']);

function sortJsonForParity(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortJsonForParity(item));
  }

  if (value && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortJsonForParity((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }

  return value ?? null;
}

function toParitySignature(value: unknown): string {
  return JSON.stringify(sortJsonForParity(value));
}

function findFidelityMismatches(
  expected: Record<FidelityParityField, unknown>,
  actual: Record<string, unknown>,
  fields: readonly FidelityParityField[] = FIDELITY_PARITY_FIELDS
): FidelityParityField[] {
  const mismatches: FidelityParityField[] = [];
  for (const field of fields) {
    if (toParitySignature(expected[field]) !== toParitySignature(actual[field])) {
      mismatches.push(field);
    }
  }
  return mismatches;
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

    const columnExistsCache = new Map<string, boolean>();
    const tableExistsCache = new Map<string, boolean>();

    const hasColumnCached: ColumnExistsResolver = async (tableName: string, columnName: string) => {
      const cacheKey = `${tableName}:${columnName}`;
      const cached = columnExistsCache.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }

      const exists = await hasColumn(tableName, columnName).catch(() => false);
      columnExistsCache.set(cacheKey, exists);
      return exists;
    };

    const hasTableCached = async (tableName: string): Promise<boolean> => {
      const cached = tableExistsCache.get(tableName);
      if (cached !== undefined) {
        return cached;
      }

      const exists = await hasTable(tableName).catch(() => false);
      tableExistsCache.set(tableName, exists);
      return exists;
    };

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

    const hasCjProductIdColumn = await hasColumnCached('products', 'cj_product_id');
    const hasVariantsTable = await hasTableCached('product_variants');
    const hasProductRatingSignalsTable = await hasTableCached('product_rating_signals');
    const categoryContext: LinkCategoryContext = {
      hasProductCategories: await hasTableCached('product_categories'),
      hasCategories: await hasTableCached('categories'),
      hasCjLinks: await hasTableCached('cj_category_links'),
      categoryByIdCache: new Map<number, any | null>(),
    };

    const existingProductByCjProductId = new Map<string, { id: string | number }>();
    if (hasCjProductIdColumn) {
      const normalizedPids = Array.from(
        new Set(
          queueProducts
            .map((qp: any) => String(qp?.cj_product_id ?? '').trim())
            .filter((pid: string) => pid.length > 0)
        )
      );

      const chunkSize = 200;
      for (let index = 0; index < normalizedPids.length; index += chunkSize) {
        const chunk = normalizedPids.slice(index, index + chunkSize);
        if (chunk.length === 0) continue;

        const { data: existingRows, error: existingError } = await admin
          .from('products')
          .select('id,cj_product_id')
          .in('cj_product_id', chunk);

        if (existingError) {
          console.error('[Import Execute] Existing product preload query error:', existingError);
          return NextResponse.json({ ok: false, error: existingError.message }, { status: 500 });
        }

        for (const row of existingRows || []) {
          const pid = String((row as any)?.cj_product_id ?? '').trim();
          if (!pid) continue;
          existingProductByCjProductId.set(pid, { id: (row as any).id });
        }
      }
    }

    // Accuracy guardrail: prevent silent field dropping for critical import fidelity fields.
    const productFidelityRequiredColumns = [
      'store_sku',
      'description',
      'overview',
      'product_info',
      'size_info',
      'product_note',
      'packing_list',
      'video_url',
      'video_source_url',
      'video_4k_url',
      'video_delivery_mode',
      'video_quality_gate_passed',
      'video_source_quality_hint',
      'media_mode',
      'supplier_rating',
      'review_count',
      'available_colors',
      'available_sizes',
      'color_image_map',
    ];
    const missingProductFidelityColumns: string[] = [];
    for (const col of productFidelityRequiredColumns) {
      const exists = await hasColumnCached('products', col);
      if (!exists) missingProductFidelityColumns.push(col);
    }

    const optionalMissingProductFidelityColumns = missingProductFidelityColumns.filter((col) =>
      OPTIONAL_IMPORT_FIDELITY_COLUMNS.has(col)
    );
    const blockingMissingProductFidelityColumns = missingProductFidelityColumns.filter((col) =>
      !OPTIONAL_IMPORT_FIDELITY_COLUMNS.has(col)
    );

    if (blockingMissingProductFidelityColumns.length > 0) {
      return NextResponse.json({
        ok: false,
        error: `Products table is missing required fidelity columns: ${blockingMissingProductFidelityColumns.join(', ')}. Please run latest Supabase migrations before importing.`,
        missingColumns: blockingMissingProductFidelityColumns,
        optionalMissingColumns: optionalMissingProductFidelityColumns,
        missingColumnsByTable: {
          products: blockingMissingProductFidelityColumns,
          product_queue: [],
        },
        remediation: {
          endpoint: '/api/admin/migrate/product-queue',
          method: 'GET',
          message: 'Use this endpoint to generate SQL for missing columns and follow schema reload instructions.',
        },
      }, { status: 400 });
    }

    if (optionalMissingProductFidelityColumns.length > 0) {
      console.warn(
        `[Import Execute] Continuing import with optional missing products columns: ${optionalMissingProductFidelityColumns.join(', ')}`
      );
    }

    const queueFidelityRequiredColumns = [
      'store_sku',
      'description_en',
      'overview',
      'product_info',
      'size_info',
      'product_note',
      'packing_list',
      'video_url',
      'video_source_url',
      'video_4k_url',
      'video_delivery_mode',
      'video_quality_gate_passed',
      'video_source_quality_hint',
      'media_mode',
      'supplier_rating',
      'review_count',
      'available_colors',
      'available_sizes',
      'color_image_map',
      'variant_pricing',
      'variants',
      'calculated_retail_sar',
    ];
    const missingQueueFidelityColumns: string[] = [];
    for (const col of queueFidelityRequiredColumns) {
      const exists = await hasColumnCached('product_queue', col);
      if (!exists) missingQueueFidelityColumns.push(col);
    }

    const optionalMissingQueueFidelityColumns = missingQueueFidelityColumns.filter((col) =>
      OPTIONAL_IMPORT_FIDELITY_COLUMNS.has(col)
    );
    const blockingMissingQueueFidelityColumns = missingQueueFidelityColumns.filter((col) =>
      !OPTIONAL_IMPORT_FIDELITY_COLUMNS.has(col)
    );

    if (blockingMissingQueueFidelityColumns.length > 0) {
      return NextResponse.json({
        ok: false,
        error: `Product queue table is missing required fidelity columns: ${blockingMissingQueueFidelityColumns.join(', ')}. Please run latest Supabase migrations before importing.`,
        missingColumns: blockingMissingQueueFidelityColumns,
        optionalMissingColumns: optionalMissingQueueFidelityColumns,
        missingColumnsByTable: {
          products: [],
          product_queue: blockingMissingQueueFidelityColumns,
        },
        remediation: {
          endpoint: '/api/admin/migrate/product-queue',
          method: 'GET',
          message: 'Use this endpoint to generate SQL for missing columns and follow schema reload instructions.',
        },
      }, { status: 400 });
    }

    if (optionalMissingQueueFidelityColumns.length > 0) {
      console.warn(
        `[Import Execute] Continuing import with optional missing product_queue columns: ${optionalMissingQueueFidelityColumns.join(', ')}`
      );
    }

    const fidelityParityFieldsToVerify: FidelityParityField[] = FIDELITY_PARITY_FIELDS.filter((field) => {
      if (!OPTIONAL_IMPORT_FIDELITY_COLUMNS.has(field)) return true;
      return !optionalMissingProductFidelityColumns.includes(field);
    });

    const results: { id: number; success: boolean; shopixoId?: string; error?: string }[] = [];

    const processQueueProduct = async (qp: any): Promise<{ id: number; success: boolean; shopixoId?: string; error?: string }> => {
      try {
        requireField(qp.cj_product_id, 'pid');
        const queueStoreSku = qp.store_sku || qp.product_code || null;
        requireField(queueStoreSku, 'storeSku');
        requireField(qp.name_en, 'name');
        const rawVariantsRequired = parseArrayOrEmpty(qp.variants);
        requireField(rawVariantsRequired, 'variants');
        for (const v of rawVariantsRequired) {
          const variantIdentifier = v?.variantSku || v?.cjSku || v?.variantId || v?.vid;
          requireField(variantIdentifier, 'variantIdentifier');
        }

        const queueMediaMode = typeof qp.media_mode === 'string' ? qp.media_mode : null;
        const queueVideoUrl = typeof qp.video_url === 'string' ? qp.video_url.trim() : '';
        const queueVideo4kUrl = typeof qp.video_4k_url === 'string' ? qp.video_4k_url.trim() : '';
        const queueQualityGatePassed =
          typeof qp.video_quality_gate_passed === 'boolean'
            ? qp.video_quality_gate_passed
            : Boolean(queueVideo4kUrl);
        const queueHasDeliverableVideo = queueVideoUrl.length > 0 && queueQualityGatePassed;
        if (requiresVideoForMediaMode(queueMediaMode) && !queueHasDeliverableVideo) {
          const reason = queueVideoUrl
            ? `Excluded from import: media mode ${queueMediaMode} requires 4K-deliverable video, but queue product failed video quality gate.`
            : `Excluded from import: media mode ${queueMediaMode} requires video, but queue product has no video_url.`;
          await admin
            .from('product_queue')
            .update({
              status: 'rejected',
              admin_notes: reason,
              reviewed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', qp.id);
          return { id: qp.id, success: false, error: reason };
        }

        let existing: { id: string | number } | null = null;
        if (hasCjProductIdColumn) {
          const normalizedPid = String(qp.cj_product_id ?? '').trim();
          if (normalizedPid) {
            existing = existingProductByCjProductId.get(normalizedPid) ?? null;
          }
        }

        if (existing) {
          try {
            const existingSupplierRating = normalizeImportedRatingValue(qp.supplier_rating);
            const existingReviewCount = normalizeImportedReviewCount(qp.review_count);
            const existingDisplayedRating = normalizeImportedRatingValue(qp.displayed_rating);
            const existingRatingConfidence = normalizeImportedRatingConfidence(qp.rating_confidence);

            const existingProductUpdate: Record<string, any> = {
              supplier_rating: existingSupplierRating,
              review_count: existingReviewCount,
              displayed_rating: existingDisplayedRating,
              rating_confidence: existingRatingConfidence,
            };

            const existingRawImages = parseArrayOrEmpty(qp.images);
            const existingEnhancedImages = sanitizeQueueGalleryImages(existingRawImages, 50);
            if (existingEnhancedImages.length > 0) {
              existingProductUpdate.images = existingEnhancedImages;
            }

            const existingColorImageMap = parseColorImageMap(qp.color_image_map);
            if (Object.keys(existingColorImageMap).length > 0) {
              existingProductUpdate.color_image_map = existingColorImageMap;
            }

            await omitMissingColumns(
              existingProductUpdate,
              'products',
              ['supplier_rating', 'review_count', 'displayed_rating', 'rating_confidence', 'images', 'color_image_map'],
              hasColumnCached
            );

            const sanitizedExistingUpdate = Object.fromEntries(
              Object.entries(existingProductUpdate).filter(([, value]) => value !== undefined)
            );

            if (Object.keys(sanitizedExistingUpdate).length > 0) {
              await admin
                .from('products')
                .update(sanitizedExistingUpdate)
                .eq('id', existing.id);
            }
          } catch {}

          await admin
            .from('product_queue')
            .update({
              status: 'imported',
              shopixo_product_id: existing.id,
              imported_at: new Date().toISOString()
            })
            .eq('id', qp.id);

          return { id: qp.id, success: true, shopixoId: String(existing.id), error: "Already imported" };
        }

        const rawVariantPricing = parseArrayOrEmpty(qp.variant_pricing);
        const hasCanonicalVariantPricing = rawVariantPricing.length > 0;
        const rawVariants = rawVariantsRequired;
        const availableSizes = normalizeImportAvailableSizes(qp.available_sizes);
        const availableColors = parseStringArrayOrNull(qp.available_colors);
        const storeCurrency = String(readEnv('NEXT_PUBLIC_CURRENCY') || 'USD').toUpperCase();
        const storePricesInUsd = storeCurrency === 'USD';

        // Parse colorImageMap from queue payload - maps color names to their specific images
        const colorImageMap = parseColorImageMap(qp.color_image_map);
        const alignedColorImageMap = alignColorImageMapToColors(availableColors, colorImageMap);

        const variants = rawVariants
          .map((v: any) => {
            const matchingPricing = rawVariantPricing.find((vp: any) => isVariantPricingMatch(v, vp));
            const resolvedSize = normalizeImportVariantSize(v.size ?? matchingPricing?.size ?? null);
            const rawResolvedColor = v.color ?? matchingPricing?.color ?? null;
            const resolvedColor = typeof rawResolvedColor === 'string' ? rawResolvedColor.trim() || null : null;
            const resolvedRetailSar = toPositiveNumberOrNull(
              matchingPricing?.price ?? matchingPricing?.sellPriceSAR ?? matchingPricing?.sellPriceSar
            )
              ?? (hasCanonicalVariantPricing ? null : toPositiveNumberOrNull(v.sellPriceSAR));

            if (!resolvedRetailSar) {
              return null;
            }

            const resolvedRetailUsd = toPositiveNumberOrNull(
              matchingPricing?.priceUsd ?? matchingPricing?.sellPriceUSD ?? matchingPricing?.sellPriceUsd
            ) ?? sarToUsd(resolvedRetailSar);

            const resolvedStorePrice = storePricesInUsd
              ? resolvedRetailUsd
              : resolvedRetailSar;

            if (!resolvedStorePrice) {
              return null;
            }

            const mappedVariantImage = resolveColorImageForColor(resolvedColor, alignedColorImageMap);
            const variantImageSource = mappedVariantImage || matchingPricing?.colorImage || v.variantImage || v.whiteImage || v.image || null;
            return {
              sku: v.storeSku || matchingPricing?.storeSku || null,
              cj_sku: v.variantSku || v.cjSku || v.vid || null,
              cj_variant_id: v.variantId || null,
              size: resolvedSize,
              color: resolvedColor,
              price_sar: resolvedRetailSar,
              price_usd: resolvedRetailUsd,
              price_store: resolvedStorePrice,
              cost_usd: toPositiveNumberOrNull(matchingPricing?.costPrice) ?? toPositiveNumberOrNull(v.variantPriceUSD) ?? null,
              shipping_usd: toPositiveNumberOrNull(matchingPricing?.shippingCost) ?? toPositiveNumberOrNull(v.shippingPriceUSD) ?? null,
              stock: v.stock ?? null,
              cj_stock: v.cjStock ?? matchingPricing?.cjStock ?? null,
              factory_stock: v.factoryStock ?? matchingPricing?.factoryStock ?? null,
              weight_g: v.weight ?? v.weightGrams ?? null,
              image_url: typeof variantImageSource === 'string' && variantImageSource.trim()
                ? enhanceProductImageUrl(variantImageSource.trim(), 'gallery')
                : null,
            };
          })
          .filter((variant): variant is NonNullable<typeof variant> => Boolean(variant));

        if (hasCanonicalVariantPricing && variants.length === 0) {
          throw new Error('Unable to resolve positive SAR prices from queue variant_pricing');
        }

        if (Object.keys(alignedColorImageMap).length > 0) {
          console.log(`[Import] Product ${qp.cj_product_id}: Using colorImageMap for ${Object.keys(alignedColorImageMap).length} colors`);
        }

        const totalStock: number | null = qp.stock_total ?? null;
        const rawImages = parseArrayOrEmpty(qp.images);
        const normalizedQueueImages = sanitizeQueueGalleryImages(rawImages, 50);
        const queueImageCandidates: unknown[] = [
          ...rawImages,
          ...Object.values(alignedColorImageMap),
          ...rawVariants.flatMap((variant: any) => [
            variant?.variantImage,
            variant?.whiteImage,
            variant?.image,
            variant?.imageUrl,
            variant?.imgUrl,
          ]),
          ...variants.flatMap((variant: any) => [
            variant?.image_url,
          ]),
        ];
        const normalizedFallbackImages = sanitizeImportProductImages(queueImageCandidates, 50);
        const fallbackRawHttpImages = rawImages
          .filter((img): img is string => typeof img === 'string' && /^https?:\/\//i.test(img))
          .map((img) => enhanceProductImageUrl(img, 'gallery'))
          .slice(0, 50);
        const finalImages = normalizedQueueImages.length > 0
          ? normalizedQueueImages
          : (normalizedFallbackImages.length > 0 ? normalizedFallbackImages : fallbackRawHttpImages);
        if (finalImages.length === 0) {
          console.warn(`[Import] Product ${qp.cj_product_id}: no valid product gallery images found in queue payload`);
        }
        const baseSlug = queueStoreSku || await ensureUniqueSlug(admin, qp.name_en);

        const variantPricesSar = variants
          .map((v: any) => Number(v.price_sar))
          .filter((p: number) => Number.isFinite(p) && p > 0);
        const variantStorePrices = variants
          .map((v: any) => Number(v.price_store ?? v.price_sar))
          .filter((p: number) => Number.isFinite(p) && p > 0);
        const queueRetailSar = Number(qp.calculated_retail_sar);
        const fallbackRetailSar = Number.isFinite(queueRetailSar) && queueRetailSar > 0 ? queueRetailSar : null;
        const fallbackStorePrice = fallbackRetailSar
          ? (storePricesInUsd ? sarToUsd(fallbackRetailSar) : fallbackRetailSar)
          : null;
        const resolvedMinPrice = variantStorePrices.length > 0 ? Math.min(...variantStorePrices) : fallbackStorePrice;
        const resolvedMaxPrice = variantStorePrices.length > 0 ? Math.max(...variantStorePrices) : fallbackStorePrice;
        const resolvedMinPriceSar = variantPricesSar.length > 0 ? Math.min(...variantPricesSar) : fallbackRetailSar;
        if (!Number.isFinite(resolvedMinPrice) || (resolvedMinPrice as number) <= 0) {
          throw new Error('Unable to resolve a positive retail price from approved queue data');
        }

        const imgCount = finalImages.length;
        const minCostUsd = Number(qp.cj_product_cost || qp.cj_price_usd || 0);
        const imgNorm = Math.max(0, Math.min(1, imgCount / 15));
        const priceNorm = Math.max(0, Math.min(1, minCostUsd / 50));
        const dynQuality = Math.max(0, Math.min(1, 0.6 * imgNorm + 0.4 * (1 - priceNorm)));
        const signals = {
          imageCount: imgCount,
          stock: typeof totalStock === 'number' ? totalStock : 0,
          variantCount: Array.isArray(variants) ? variants.length : 0,
          qualityScore: typeof qp.quality_score === 'number' && isFinite(qp.quality_score)
            ? Math.max(0, Math.min(1, qp.quality_score))
            : dynQuality,
          priceUsd: minCostUsd,
          sentiment: 0,
          orderVolume: typeof qp.total_sales === 'number' ? qp.total_sales : 0,
        };
        const ratingOut = computeRating(signals);

        const queueSupplierRating = normalizeImportedRatingValue(qp.supplier_rating);
        const queueReviewCount = normalizeImportedReviewCount(qp.review_count);
        const importedDisplayedRating = normalizeImportedRatingValue(qp.displayed_rating);
        const importedRatingConfidence = normalizeImportedRatingConfidence(qp.rating_confidence);

        const productPayload: Record<string, any> = {
          title: qp.name_en,
          slug: baseSlug,
          price: resolvedMinPrice,
          category: qp.category || "General",
          stock: totalStock,
        };

        const rawSpecifications = parseObjectOrEmpty(qp.specifications);
        const rawSellingPoints = parseArrayOrEmpty(qp.selling_points);

        const optionalFields: Record<string, any> = {
          description: qp.description_en ?? null,
          overview: qp.overview ?? null,
          product_info: qp.product_info ?? null,
          size_info: qp.size_info ?? null,
          product_note: qp.product_note ?? null,
          packing_list: qp.packing_list ?? null,
          images: finalImages,
          video_url: qp.video_url || null,
          video_source_url: qp.video_source_url || null,
          video_4k_url: qp.video_4k_url || null,
          video_delivery_mode: qp.video_delivery_mode || null,
          video_quality_gate_passed:
            typeof qp.video_quality_gate_passed === 'boolean' ? qp.video_quality_gate_passed : null,
          video_source_quality_hint: qp.video_source_quality_hint || null,
          media_mode: qp.media_mode || null,
          has_video:
            typeof qp.has_video === 'boolean'
              ? qp.has_video
              : (qp.video_4k_url || qp.video_url ? true : null),
          product_code: qp.product_code || null,
          is_active: null,
          cj_product_id: qp.cj_product_id,
          supplier_sku: qp.cj_sku || null,
          store_sku: queueStoreSku,
          free_shipping: null,
          processing_time_hours: qp.processing_days ? qp.processing_days * 24 : null,
          delivery_time_hours: qp.delivery_days_max ? qp.delivery_days_max * 24 : null,
          variants: variants.length > 0 ? variants : null,
          weight_g: qp.weight_g || null,
          weight_grams: qp.weight_g || null,
          pack_length: qp.pack_length || null,
          pack_width: qp.pack_width || null,
          pack_height: qp.pack_height || null,
          material: qp.material || null,
          product_type: qp.product_type || null,
          origin_country: qp.origin_country || null,
          origin_country_code: qp.origin_country || null,
          hs_code: qp.hs_code || null,
          size_chart_images: qp.size_chart_images || null,
          available_sizes: availableSizes,
          available_colors: availableColors,
          color_image_map: Object.keys(alignedColorImageMap).length > 0 ? alignedColorImageMap : null,
          has_variants: variants.length > 0,
          min_price: resolvedMinPrice,
          max_price: resolvedMaxPrice,
          specifications: rawSpecifications,
          selling_points: rawSellingPoints,
          cj_category_id: qp.cj_category_id || null,
          supplier_rating: queueSupplierRating,
          review_count: queueReviewCount,
          displayed_rating: importedDisplayedRating,
          rating_confidence: importedRatingConfidence,
          inventory_status: qp.inventory_status ?? null,
          inventory_error_message: qp.inventory_error_message ?? null,
          available_models: qp.available_models ?? null,
        };

        await omitMissingColumns(
          optionalFields,
          'products',
          [
            'description', 'images', 'video_url', 'has_video', 'product_code', 'is_active', 'cj_product_id',
            'video_source_url', 'video_4k_url', 'video_delivery_mode', 'video_quality_gate_passed', 'video_source_quality_hint', 'media_mode',
            'free_shipping', 'processing_time_hours', 'delivery_time_hours',
            'supplier_sku', 'variants', 'weight_g', 'weight_grams', 'pack_length', 'pack_width',
            'pack_height', 'material', 'product_type', 'origin_country', 'origin_country_code', 'hs_code',
            'size_chart_images', 'available_sizes', 'available_colors', 'has_variants',
            'min_price', 'max_price', 'specifications', 'selling_points',
            'cj_category_id', 'supplier_rating', 'review_count', 'displayed_rating', 'rating_confidence', 'overview', 'product_info', 'size_info',
            'product_note', 'packing_list', 'store_sku', 'inventory_status', 'inventory_error_message',
            'available_models', 'product_type', 'color_image_map'
          ],
          hasColumnCached
        );

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

        const expectedFidelity: Record<FidelityParityField, unknown> = {
          store_sku: queueStoreSku,
          description: qp.description_en ?? null,
          overview: qp.overview ?? null,
          product_info: qp.product_info ?? null,
          size_info: qp.size_info ?? null,
          product_note: qp.product_note ?? null,
          packing_list: qp.packing_list ?? null,
          supplier_rating: queueSupplierRating,
          review_count: queueReviewCount,
          available_colors: availableColors,
          available_sizes: availableSizes,
          color_image_map: Object.keys(alignedColorImageMap).length > 0 ? alignedColorImageMap : null,
        };

        if (fidelityParityFieldsToVerify.length > 0) {
          const { data: persistedFidelity, error: fidelityError } = await admin
            .from('products')
            .select(fidelityParityFieldsToVerify.join(','))
            .eq('id', productId)
            .maybeSingle();

          if (fidelityError || !persistedFidelity) {
            throw new Error(`Failed to verify persisted fidelity fields for product ${productId}`);
          }

          const persistedFidelityRecord = persistedFidelity as unknown as Record<string, unknown>;

          const mismatchedFields = findFidelityMismatches(
            expectedFidelity,
            persistedFidelityRecord,
            fidelityParityFieldsToVerify
          );

          if (mismatchedFields.length > 0) {
            await admin.from('products').delete().eq('id', productId);
            throw new Error(
              `Import fidelity check failed for queue product ${qp.id} (${qp.cj_product_id}): mismatched fields ${mismatchedFields.join(', ')}`
            );
          }
        }

        if (hasVariantsTable && variants.length > 0) {
          // Create proper variant rows with Color/Size format
          const variantRows = variants.map((v: any) => {
            const normalizedColor = typeof v.color === 'string' ? v.color.trim() : '';
            const normalizedSize = normalizeImportVariantSize(v.size) || '';
            const hasColor = normalizedColor.length > 0;
            const hasSize = normalizedSize.length > 0;

            let optionName = 'Default';
            let optionValue = 'Default';

            if (hasColor && hasSize) {
              optionName = 'Color / Size';
              optionValue = `${normalizedColor} / ${normalizedSize}`;
            } else if (hasColor) {
              optionName = 'Color';
              optionValue = normalizedColor;
            } else if (hasSize) {
              optionName = 'Size';
              optionValue = normalizedSize;
            }

            return {
              product_id: productId,
              option_name: optionName,
              option_value: optionValue,
              cj_sku: v.cj_sku || null,
              store_sku: v.sku || null,
              cj_variant_id: v.cj_variant_id || null,
              price: v.price_store ?? v.price_sar,
              cost_price: v.cost_usd || null,
              stock: v.stock,
              image_url:
                typeof v.image_url === 'string' && v.image_url.trim()
                  ? enhanceProductImageUrl(v.image_url.trim(), 'gallery')
                  : null,
              shipping_usd: v.shipping_usd || null,
            };
          });

          await admin.from('product_variants').insert(variantRows);
        }

        // Link product to category - prefer direct Supabase category ID if available
        const categoryToLink = qp.category_name || qp.category || "General";
        const productTitle = qp.name_en || "";
        const productDescription = qp.description_en || "";
        const supabaseCategoryId = qp.supabase_category_id;

        let categoryResult;
        if (supabaseCategoryId && supabaseCategoryId > 0) {
          // Use direct category linking when Supabase ID is provided (100% accurate)
          const linked = await linkProductToCategory(
            admin,
            productId,
            categoryToLink,
            qp.cj_category_id,
            supabaseCategoryId,
            categoryContext
          );
          categoryResult = { success: linked, categoriesLinked: linked ? 1 : 0 };
          if (linked) {
            console.log(`[Import] ✓ Product ${productId} linked via direct Supabase category ID: ${supabaseCategoryId}`);
          }
        } else {
          // Fallback to intelligent multi-category assignment
          categoryResult = await linkProductToMultipleCategories(
            admin,
            productId,
            productTitle,
            productDescription,
            categoryToLink
          );
        }

        if (categoryResult.success) {
          console.log(`[Import] Product ${productId} linked to ${categoryResult.categoriesLinked} categories`);
        }

        await admin
          .from('product_queue')
          .update({
            status: 'imported',
            shopixo_product_id: productId,
            imported_at: new Date().toISOString(),
            calculated_retail_sar: resolvedMinPriceSar,
            margin_applied: null
          })
          .eq('id', qp.id);

        try {
          if (hasProductRatingSignalsTable) {
            await admin.from('product_rating_signals').insert({
              product_id: productId,
              cj_product_id: qp.cj_product_id || null,
              context: 'import',
              signals: ratingOut.signals,
              displayed_rating: fullPayload.displayed_rating,
              rating_confidence: fullPayload.rating_confidence,
            });
          }
        } catch (e) {
          console.log('[Import] Failed to insert rating signals snapshot:', (e as any)?.message || e);
        }

        if (hasCjProductIdColumn) {
          const normalizedPid = String(qp.cj_product_id ?? '').trim();
          if (normalizedPid) {
            existingProductByCjProductId.set(normalizedPid, { id: productId });
          }
        }

        return { id: qp.id, success: true, shopixoId: String(productId) };
      } catch (e: any) {
        console.error(`Failed to import product ${qp.id}:`, e);
        return { id: qp.id, success: false, error: e?.message || "Import failed" };
      }
    };

    const importParallelism = Math.max(
      1,
      Math.min(12, Number(readEnv('IMPORT_EXECUTE_PARALLELISM') || '4'))
    );

    for (let index = 0; index < queueProducts.length; index += importParallelism) {
      const chunk = queueProducts.slice(index, index + importParallelism);
      const chunkResults = await Promise.all(chunk.map((qp: any) => processQueueProduct(qp)));
      results.push(...chunkResults);
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const firstFailure = results.find((result) => !result.success) || null;

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

    if (successCount === 0 && failCount > 0) {
      return NextResponse.json({
        ok: false,
        error: firstFailure?.error
          ? `Import failed: ${firstFailure.error}`
          : "Import failed: no approved products were imported.",
        imported: 0,
        failed: failCount,
        firstFailure,
        results,
      }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      imported: successCount,
      failed: failCount,
      firstFailure,
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
