import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/utils/slug";
import { hasColumn, hasTable } from "@/lib/db-features";
import { linkProductToMultipleCategories } from "@/lib/category-intelligence";
import { computeRating } from "@/lib/rating/engine";

// Helper to find category by name/slug/CJ-link and link product to category hierarchy
async function linkProductToCategory(admin: any, productId: number, categoryName: string, cjCategoryId?: string, supabaseCategoryId?: number): Promise<boolean> {
  try {
    const hasProductCategories = await hasTable('product_categories').catch(() => false);
    const hasCategories = await hasTable('categories').catch(() => false);
    
    if (!hasProductCategories || !hasCategories) {
      return false;
    }

    let category: any = null;
    
    // 0. BEST: Direct Supabase category ID (passed from discovery with Features selection)
    if (supabaseCategoryId && supabaseCategoryId > 0) {
      const { data: directMatch } = await admin
        .from('categories')
        .select('id, name, parent_id, slug')
        .eq('id', supabaseCategoryId)
        .maybeSingle();
      
      if (directMatch) {
        category = directMatch;
        console.log(`[Import] ✓ Direct Supabase category match: ${directMatch.name} (id: ${directMatch.id})`);
      }
    }
    
    // 1. Try CJ category ID lookup via cj_category_links table
    if (!category && cjCategoryId) {
      const hasCjLinks = await hasTable('cj_category_links').catch(() => false);
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const DEFAULT_SHIPPING_USD = 5;
const DEFAULT_PAYMENT_FEE_PERCENT = 2.9;
const DEFAULT_MARGIN_PERCENT = 40;
const DEFAULT_MIN_PROFIT_USD = 10;

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

function generateSku(prefix: string, productId: string, variantIndex: number): string {
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${productId.slice(-4).toUpperCase()}-${variantIndex + 1}-${random}`;
}

// Clean HTML entities and STRIP ALL HTML TAGS from description
function cleanDescription(html: string | null | undefined): string {
  if (!html) return '';
  
  let text = html;
  
  // First, replace block-level tags with newlines for better formatting
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  
  // Remove all remaining HTML tags completely
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode common HTML entities
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&mdash;': '—',
    '&ndash;': '–',
    '&hellip;': '...',
    '&#160;': ' ',
    '&#8203;': '', // Zero-width space
  };
  
  for (const [entity, char] of Object.entries(entities)) {
    text = text.replace(new RegExp(entity, 'gi'), char);
  }
  
  // Decode numeric entities
  text = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  text = text.replace(/&#x([0-9A-Fa-f]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
  
  // Clean up multiple newlines and spaces
  text = text.replace(/\n{3,}/g, '\n\n'); // Max 2 newlines
  text = text.replace(/[ \t]+/g, ' '); // Multiple spaces/tabs to single space
  text = text.replace(/^\s+|\s+$/gm, ''); // Trim each line
  text = text.trim();
  
  return text;
}

// Clean HTML from selling points array
function cleanSellingPoints(points: any): string[] {
  if (!points) return [];
  const arr = Array.isArray(points) ? points : [];
  return arr.map((p: any) => {
    if (typeof p === 'string') {
      return cleanDescription(p);
    }
    return String(p || '');
  }).filter(Boolean);
}

// Clean specifications object - remove HTML from string values, preserve arrays/objects
function cleanSpecifications(specs: any): Record<string, any> {
  if (!specs || typeof specs !== 'object') return {};
  
  function cleanValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }
    if (typeof value === 'string') {
      return cleanDescription(value);
    }
    if (Array.isArray(value)) {
      return value.map(cleanValue);
    }
    if (typeof value === 'object') {
      const cleaned: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) {
        cleaned[k] = cleanValue(v);
      }
      return cleaned;
    }
    return value; // numbers, booleans, etc.
  }
  
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(specs)) {
    cleaned[key] = cleanValue(value);
  }
  return cleaned;
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

        const rawVariantPricing = typeof qp.variant_pricing === 'string' ? JSON.parse(qp.variant_pricing) : (qp.variant_pricing || []);
        const rawVariants = typeof qp.variants === 'string' ? JSON.parse(qp.variants) : (qp.variants || []);
        
        // Parse colorImageMap from queue payload - maps color names to their specific images
        const colorImageMap: Record<string, string> = typeof qp.color_image_map === 'string' 
          ? JSON.parse(qp.color_image_map) 
          : (qp.color_image_map || {});
        
        const hasValidVariantPricing = rawVariantPricing.length > 0 && rawVariantPricing.some((vp: any) => vp.price > 0 && vp.costPrice > 0);
        
        const avgProductCostUsd = qp.cj_product_cost || qp.cj_price_usd || 0;
        const avgShippingCostUsd = qp.cj_shipping_cost || qp.shipping_cost_usd || DEFAULT_SHIPPING_USD;
        
        const pricing = hasValidVariantPricing 
          ? null 
          : await calculateRetailPrice(avgProductCostUsd, avgShippingCostUsd, qp.category || "General", admin);
        
        const defaultRetailPrice = pricing?.retailSar || 50;
        
        const variants = rawVariants.map((v: any, i: number) => {
          const matchingPricing = rawVariantPricing.find((vp: any) => 
            vp.variantId === v.variantId || vp.sku === v.variantSku
          );
          
          const variantCostUsd = matchingPricing?.costPrice || v.variantPriceUSD || v.price || avgProductCostUsd;
          const variantShippingUsd = matchingPricing?.shippingCost || v.shippingPriceUSD || avgShippingCostUsd;
          const variantSellPrice = matchingPricing?.price || v.sellPriceSAR || defaultRetailPrice;
          
          // Calculate stock PROPERLY: null/undefined means "unknown availability" (NOT 0)
          // Only subtract safety buffer when we have actual stock data
          const rawStock = matchingPricing?.stock ?? v.stock ?? v.variantQuantity ?? null;
          let finalStock: number | null = null;
          if (typeof rawStock === 'number' && rawStock >= 0) {
            // Apply 5-unit safety buffer, but result could still be 0 (out of stock)
            finalStock = Math.max(0, rawStock - 5);
          }
          // If rawStock is null/undefined, finalStock stays null = "unknown availability"
          
          return {
            sku: generateSku("CJ", qp.cj_product_id, i),
            cj_sku: v.variantSku || v.cjSku || v.vid || null,
            cj_variant_id: v.variantId || null,
            size: matchingPricing?.size || v.size || null,
            color: matchingPricing?.color || v.color || null,
            price_sar: Math.round(variantSellPrice * 100) / 100,
            cost_usd: variantCostUsd,
            shipping_usd: variantShippingUsd,
            stock: finalStock,
            cj_stock: matchingPricing?.cjStock ?? v.cjStock ?? null,
            factory_stock: matchingPricing?.factoryStock ?? v.factoryStock ?? null,
            weight_g: v.weight || v.weightGrams || null,
            // Use colorImageMap as PRIMARY source for color-specific images
            // This ensures color swatches show the correct product image for each color
            image_url: (matchingPricing?.color && colorImageMap[matchingPricing.color]) 
              ? colorImageMap[matchingPricing.color]
              : (v.color && colorImageMap[v.color])
                ? colorImageMap[v.color]
                : matchingPricing?.colorImage || v.variantImage || v.imageUrl || v.image || v.whiteImage || null,
          };
        });
        
        if (Object.keys(colorImageMap).length > 0) {
          console.log(`[Import] Product ${qp.cj_product_id}: Using colorImageMap for ${Object.keys(colorImageMap).length} colors`);
        }

        // Calculate total stock - only sum explicit stock values
        // If all variants have null stock, totalStock stays null (unknown inventory)
        const knownStocks = variants.filter((v: any) => typeof v.stock === 'number');
        const totalStock: number | null = knownStocks.length > 0 
          ? knownStocks.reduce((sum: number, v: any) => sum + v.stock, 0)
          : null; // No fabrication - null means unknown
        const rawImages = typeof qp.images === 'string' ? JSON.parse(qp.images) : (qp.images || []);
        const baseSlug = await ensureUniqueSlug(admin, qp.name_en);

        const variantPrices = variants.map((v: any) => v.price_sar).filter((p: number) => p > 0);
        const minVariantPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : defaultRetailPrice;
        const maxVariantPrice = variantPrices.length > 0 ? Math.max(...variantPrices) : defaultRetailPrice;

        const productPayload: Record<string, any> = {
          title: qp.name_en,
          slug: baseSlug,
          price: minVariantPrice,
          category: qp.category || "General",
          stock: totalStock,
        };

        const rawSpecifications = typeof qp.specifications === 'string' ? JSON.parse(qp.specifications) : (qp.specifications || {});
        const rawSellingPoints = typeof qp.selling_points === 'string' ? JSON.parse(qp.selling_points) : (qp.selling_points || []);
        
        // Clean HTML from specifications and selling points
        const cleanedSpecs = cleanSpecifications(rawSpecifications);
        const cleanedSellingPoints = cleanSellingPoints(rawSellingPoints);
        
        // SMART DEDUPLICATION: Use normalized keys (lowercase, trimmed, collapsed whitespace)
        // but preserve the original CJ display name (first occurrence wins)
        function deduplicateByNormalizedKey(items: string[]): string[] {
          const seen = new Map<string, string>();
          for (const item of items) {
            if (!item || typeof item !== 'string') continue;
            const display = item.trim();
            if (!display) continue;
            // Normalize: lowercase, trim, collapse multiple spaces to single space
            const key = display.toLowerCase().replace(/\s+/g, ' ');
            if (!seen.has(key)) {
              seen.set(key, display); // First occurrence preserves original display name
            }
          }
          return Array.from(seen.values());
        }
        
        // Extract ALL sizes from all available sources (merged and smart-deduplicated)
        const qpSizes = Array.isArray(qp.available_sizes) ? qp.available_sizes : [];
        const pricingSizes = rawVariantPricing.map((vp: any) => vp.size).filter(Boolean);
        const variantSizes = variants.map((v: any) => v.size).filter(Boolean);
        const allSizes = [...qpSizes, ...pricingSizes, ...variantSizes];
        const availableSizes = deduplicateByNormalizedKey(allSizes);
        
        // Extract ALL colors from all available sources (merged and smart-deduplicated)
        const qpColors = Array.isArray(qp.available_colors) ? qp.available_colors : [];
        const pricingColors = rawVariantPricing.map((vp: any) => vp.color).filter(Boolean);
        const variantColors = variants.map((v: any) => v.color).filter(Boolean);
        const allColors = [...qpColors, ...pricingColors, ...variantColors];
        const availableColors = deduplicateByNormalizedKey(allColors);
        
        console.log(`[Import] Product ${qp.cj_product_id}: Found ${availableColors.length} colors: ${availableColors.join(', ')}`);
        console.log(`[Import] Product ${qp.cj_product_id}: Found ${availableSizes.length} sizes: ${availableSizes.join(', ')}`);

        // Compute internal rating using available signals
        const qualityScore = typeof qp.quality_score === 'number' && isFinite(qp.quality_score)
          ? Math.max(0, Math.min(1, qp.quality_score))
          : 0.6;
        const signals = {
          imageCount: Array.isArray(rawImages) ? rawImages.length : 0,
          stock: typeof totalStock === 'number' ? totalStock : 0,
          variantCount: Array.isArray(variants) ? variants.length : 0,
          qualityScore,
          priceUsd: Number(avgProductCostUsd) || 0,
          sentiment: 0,
          orderVolume: typeof qp.total_sales === 'number' ? qp.total_sales : 0,
        };
        const ratingOut = computeRating(signals);

        const optionalFields: Record<string, any> = {
          description: cleanDescription(qp.description_en),
          images: rawImages,
          video_url: qp.video_url || null,
          is_active: totalStock === null || totalStock > 0,
          cj_product_id: qp.cj_product_id,
          supplier_sku: qp.cj_sku || `CJ-${qp.cj_product_id}`,
          free_shipping: true,
          processing_time_hours: qp.processing_days ? qp.processing_days * 24 : null,
          delivery_time_hours: qp.delivery_days_max ? qp.delivery_days_max * 24 : null,
          variants: variants.length > 0 ? variants : null,
          weight_g: qp.weight_g || null,
          weight_grams: qp.weight_g || null,
          pack_length: qp.pack_length || null,
          pack_width: qp.pack_width || null,
          pack_height: qp.pack_height || null,
          material: cleanDescription(qp.material) || null,
          origin_country: qp.origin_country || null,
          origin_country_code: qp.origin_country || null,
          hs_code: qp.hs_code || null,
          size_chart_images: qp.size_chart_images || null,
          available_sizes: availableSizes,
          available_colors: availableColors,
          has_variants: variants.length > 0,
          min_price: minVariantPrice,
          max_price: maxVariantPrice,
          specifications: cleanedSpecs,
          selling_points: cleanedSellingPoints,
          cj_category_id: qp.cj_category_id || null,
          displayed_rating: ratingOut.displayedRating,
          rating_confidence: ratingOut.ratingConfidence,
        };

        await omitMissingColumns(optionalFields, [
          'description', 'images', 'video_url', 'is_active', 'cj_product_id',
          'free_shipping', 'processing_time_hours', 'delivery_time_hours',
          'supplier_sku', 'variants', 'weight_g', 'weight_grams', 'pack_length', 'pack_width', 
          'pack_height', 'material', 'origin_country', 'origin_country_code', 'hs_code',
          'size_chart_images', 'available_sizes', 'available_colors', 'has_variants',
          'min_price', 'max_price', 'specifications', 'selling_points',
          'cj_category_id', 'displayed_rating', 'rating_confidence'
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
          // Create proper variant rows with Color/Size format
          const variantRows = variants.map((v: any) => {
            const hasColor = v.color && v.color.trim();
            const hasSize = v.size && v.size.trim();
            
            let optionName = 'Default';
            let optionValue = 'Default';
            
            if (hasColor && hasSize) {
              optionName = 'Color / Size';
              optionValue = `${v.color} / ${v.size}`;
            } else if (hasColor) {
              optionName = 'Color';
              optionValue = v.color;
            } else if (hasSize) {
              optionName = 'Size';
              optionValue = v.size;
            }
            
            return {
              product_id: productId,
              option_name: optionName,
              option_value: optionValue,
              cj_sku: v.cj_sku || null,
              cj_variant_id: v.cj_variant_id || null,
              price: v.price_sar,
              cost_price: v.cost_usd || null,
              stock: v.stock,
              image_url: v.image_url || null,
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
          const linked = await linkProductToCategory(admin, productId, categoryToLink, qp.cj_category_id, supabaseCategoryId);
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
            calculated_retail_sar: minVariantPrice,
            margin_applied: pricing?.marginApplied || 8
          })
          .eq('id', qp.id);

        // Insert rating signal snapshot if table exists
        try {
          const signalsTableExists = await hasTable('product_rating_signals').catch(() => false);
          if (signalsTableExists) {
            await admin.from('product_rating_signals').insert({
              product_id: productId,
              cj_product_id: qp.cj_product_id || null,
              context: 'import',
              signals: ratingOut.signals,
              displayed_rating: ratingOut.displayedRating,
              rating_confidence: ratingOut.ratingConfidence,
            });
          }
        } catch (e) {
          console.log('[Import] Failed to insert rating signals snapshot:', (e as any)?.message || e);
        }

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
