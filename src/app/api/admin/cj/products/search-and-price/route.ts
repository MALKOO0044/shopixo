import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, calculateShippingToSA, calculateFinalPricingSAR, mapCjItemToProductLike, cacheVariantsForProduct, getCachedVariants, updateCachedVariantShipping, CachedVariant } from '@/lib/cj/v2';
import { fetchJson } from '@/lib/http';
import { ensureAdmin } from '@/lib/auth/admin-guard';
import { loggerForRequest } from '@/lib/log';
import { logError } from '@/lib/error-logger';
import { throttleCjRequest } from '@/lib/cj/rate-limit';
import { createClient } from '@supabase/supabase-js';

// Get Supabase admin client for caching
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('[Search+Price] Missing Supabase credentials for caching');
    return null;
  }
  return createClient(url, key);
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max for unified search+pricing

const CJ_BASE = process.env.CJ_API_BASE || 'https://developers.cjdropshipping.com/api2.0/v1';
const USD_TO_SAR_RATE = 3.75;

// Resolves variants for a product using the TWO-PHASE CACHING approach:
// 1. First check if variants are cached in database
// 2. If not cached: add product to "My Products" -> query variants -> cache them
// This works because /product/variant/query ONLY works for products in "My Products"
async function resolveVariantsWithCache(
  productId: string,
  supabase: any
): Promise<{ vid: string; variantSku: string; price: number }[] | null> {
  if (!supabase) {
    console.error(`[Search+Price] No Supabase client available for caching`);
    return null;
  }
  
  try {
    console.log(`[Search+Price] Resolving variants for pid=${productId} using cache...`);
    
    // Step 1: Check cache first
    const cachedVariants = await getCachedVariants(productId, supabase);
    
    if (cachedVariants && cachedVariants.length > 0) {
      console.log(`[Search+Price] Found ${cachedVariants.length} cached variants for pid=${productId}`);
      return cachedVariants.map((v: CachedVariant) => ({
        vid: v.cj_variant_id,
        variantSku: v.variant_sku || '',
        price: v.variant_sell_price || 0,
      }));
    }
    
    // Step 2: Not cached - use the two-phase approach
    console.log(`[Search+Price] No cache for pid=${productId}, starting two-phase resolution...`);
    const newlyCache = await cacheVariantsForProduct(productId, supabase);
    
    if (!newlyCache || newlyCache.length === 0) {
      console.log(`[Search+Price] Failed to cache variants for pid=${productId}`);
      return null;
    }
    
    console.log(`[Search+Price] Successfully cached ${newlyCache.length} variants for pid=${productId}`);
    return newlyCache.map((v: CachedVariant) => ({
      vid: v.cj_variant_id,
      variantSku: v.variant_sku || '',
      price: v.variant_sell_price || 0,
    }));
    
  } catch (err: any) {
    console.error(`[Search+Price] Variant resolution error for pid=${productId}: ${err?.message}`);
    return null;
  }
}

async function fetchCjProductsByCategoryV2(
  token: string, 
  categoryId: string, 
  pageNum: number, 
  pageSize: number
): Promise<{ list: any[]; total: number }> {
  const params = new URLSearchParams();
  params.set('page', String(pageNum));
  params.set('size', String(Math.min(pageSize, 100)));
  params.set('lv3categoryList', categoryId);
  
  const url = `${CJ_BASE}/product/listV2?${params}`;
  
  try {
    const data = await throttleCjRequest(async () => {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'CJ-Access-Token': token,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      return await res.json();
    });
    
    const totalRecords = data?.data?.totalRecords || 0;
    const contentList = data?.data?.content || [];
    
    let allProducts: any[] = [];
    for (const content of contentList) {
      if (Array.isArray(content?.productList)) {
        allProducts = allProducts.concat(content.productList);
      }
    }
    
    if (data?.code === 200 && data?.result) {
      // Debug: log first raw product to verify CJ API response format
      if (allProducts.length > 0) {
        const sample = allProducts[0];
        console.log(`[Search+Price] V2 API sample product fields:`, JSON.stringify({
          id: sample.id,
          nameEn: sample.nameEn?.slice(0, 30),
          sku: sample.sku,
          bigImage: sample.bigImage?.slice(0, 50),
          sellPrice: sample.sellPrice,
          nowPrice: sample.nowPrice,
          discountPrice: sample.discountPrice,
          warehouseInventoryNum: sample.warehouseInventoryNum,
        }));
      }
      
      const mappedProducts = allProducts.map(p => ({
        ...p,
        pid: p.id || p.pid,
        productId: p.id || p.pid,
        productNameEn: p.nameEn || p.productNameEn,
        name: p.nameEn || p.productNameEn,
        productImage: p.bigImage || p.productImage,
        stock: p.warehouseInventoryNum || p.totalVerifiedInventory || p.totalUnVerifiedInventory || 0,
        warehouseInventoryNum: p.warehouseInventoryNum || 0,
        sellPrice: parseFloat(p.sellPrice || p.nowPrice || p.discountPrice || '0'),
        price: parseFloat(p.sellPrice || p.nowPrice || p.discountPrice || '0'),
        sku: p.sku || p.spu || '',
        productSku: p.sku || p.spu || '',
        listedNum: p.listedNum || 0,
        deliveryCycle: p.deliveryCycle || null,
        supplierName: p.supplierName || '',
        addMarkStatus: p.addMarkStatus || 0,
      }));
      
      return { list: mappedProducts, total: totalRecords };
    }
    
    return { list: [], total: 0 };
  } catch (e: any) {
    console.error(`[Search+Price] V2 fetch error: ${e?.message}`);
    return { list: [], total: 0 };
  }
}

type VariantPricingResult = {
  variantId: string;
  variantSku: string;
  variantPriceUSD: number;
  shippingAvailable: boolean;
  shippingPriceUSD: number;
  shippingPriceSAR: number;
  deliveryDays: string;
  logisticName?: string;
  sellPriceSAR: number;
  totalCostSAR: number;
  profitSAR: number;
  error?: string;
};

type PricedProduct = {
  pid: string;
  name: string;
  image: string;
  stock: number;
  productSku: string;
  listedNum: number;
  deliveryCycle: string | null;
  supplierName: string;
  freeShipping: boolean;
  variants: VariantPricingResult[];
  lowestPriceSAR: number | null;
  highestPriceSAR: number | null;
  hasAvailableVariant: boolean;
};

export async function POST(request: NextRequest) {
  const log = loggerForRequest(request);
  const startTime = Date.now();
  
  try {
    const guard = await ensureAdmin();
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: guard.reason }, { status: 401 });
    }
    
    const body = await request.json();
    const {
      categoryIds,
      quantity = 25,
      profitMarginPercent = 30,
      minStock = 0,
      minPopularity = 0,
      minPrice = 0,
      maxPrice = 0,
      freeShippingOnly = false,
    } = body;
    
    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return NextResponse.json({ ok: false, error: 'categoryIds array is required' }, { status: 400 });
    }
    
    if (profitMarginPercent < 0 || profitMarginPercent > 200) {
      return NextResponse.json({ ok: false, error: 'profitMarginPercent must be between 0 and 200' }, { status: 400 });
    }
    
    console.log(`[Search+Price] Starting unified search: categories=[${categoryIds.join(',')}], qty=${quantity}, profit=${profitMarginPercent}%`);
    
    const token = await getAccessToken();
    
    // Phase 1: Search products
    console.log(`[Search+Price] Phase 1: Searching products...`);
    const phase1Start = Date.now();
    
    const pageSize = 50;
    const quantityPerCategory = Math.ceil(quantity / categoryIds.length);
    const maxPagesPerCategory = Math.min(10, Math.ceil(quantityPerCategory * 2 / pageSize));
    
    const seenPids = new Set<string>();
    let allProducts: any[] = [];
    let totalFound = 0;
    
    for (const catId of categoryIds) {
      if (allProducts.length >= quantity * 1.5) break;
      
      for (let page = 1; page <= maxPagesPerCategory; page++) {
        const pageResult = await fetchCjProductsByCategoryV2(token, catId, page, pageSize);
        
        if (page === 1) totalFound += pageResult.total;
        
        for (const rawItem of pageResult.list) {
          const itemPid = String(rawItem.pid || rawItem.productId || rawItem.id || '');
          if (seenPids.has(itemPid)) continue;
          seenPids.add(itemPid);
          
          const listedNum = Number(rawItem.listedNum || 0);
          if (minPopularity > 0 && listedNum < minPopularity) continue;
          
          const itemStock = Number(rawItem.stock || rawItem.warehouseInventoryNum || 0);
          if (minStock > 0 && itemStock < minStock) continue;
          
          const itemPrice = Number(rawItem.sellPrice || rawItem.price || 0);
          if (minPrice > 0 && itemPrice < minPrice) continue;
          if (maxPrice > 0 && itemPrice > maxPrice) continue;
          
          if (freeShippingOnly && rawItem.addMarkStatus !== 1) continue;
          
          const mapped = mapCjItemToProductLike(rawItem);
          if (mapped) {
            allProducts.push({
              ...mapped,
              listedNum,
              stock: itemStock,
              productSku: rawItem.productSku || rawItem.sku || '',
              deliveryCycle: rawItem.deliveryCycle || null,
              supplierName: rawItem.supplierName || '',
              freeShipping: rawItem.addMarkStatus === 1,
            });
          }
        }
        
        if (pageResult.list.length < pageSize) break;
        if (allProducts.length >= quantity * 1.5) break;
      }
    }
    
    allProducts.sort((a, b) => (b.listedNum || 0) - (a.listedNum || 0));
    allProducts = allProducts.slice(0, Math.min(quantity, allProducts.length));
    
    const phase1Duration = Date.now() - phase1Start;
    console.log(`[Search+Price] Phase 1 complete: ${allProducts.length} products in ${phase1Duration}ms`);
    
    if (allProducts.length === 0) {
      return NextResponse.json({
        ok: true,
        products: [],
        stats: {
          totalFound,
          productsSearched: 0,
          variantsProcessed: 0,
          variantsSuccess: 0,
          variantsFailed: 0,
          phase1DurationMs: phase1Duration,
          phase2DurationMs: 0,
          totalDurationMs: Date.now() - startTime,
        },
        profitMarginPercent,
      });
    }
    
    // Phase 2: Calculate pricing for ALL variants
    console.log(`[Search+Price] Phase 2: Calculating shipping and pricing...`);
    const phase2Start = Date.now();
    
    // Initialize Supabase client for caching variants
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.warn('[Search+Price] Supabase client not available - variant caching disabled');
    }
    
    const pricedProducts: PricedProduct[] = [];
    let variantsProcessed = 0;
    let variantsSuccess = 0;
    let variantsFailed = 0;
    
    const totalVariants = allProducts.reduce((sum, p) => {
      const variants = p.variants || [];
      return sum + Math.max(1, variants.length);
    }, 0);
    
    const estimatedWaitMs = totalVariants * 1200;
    const maxAllowedMs = 280000; // 280s - leave buffer before 300s maxDuration
    
    console.log(`[Search+Price] Estimated ${totalVariants} variants, ~${Math.ceil(estimatedWaitMs / 1000)}s wait time`);
    
    // Timeout guard: if estimated time exceeds allowed, limit variants processed
    const willTimeout = estimatedWaitMs > maxAllowedMs;
    if (willTimeout) {
      console.warn(`[Search+Price] Warning: Estimated ${Math.ceil(estimatedWaitMs / 1000)}s exceeds ${Math.ceil(maxAllowedMs / 1000)}s limit. Processing may be partial.`);
    }
    
    for (let pIdx = 0; pIdx < allProducts.length; pIdx++) {
      // Runtime timeout check - exit if approaching limit
      // BLOCKING REQUIREMENT: If timeout, fail rather than return partial results
      const elapsedMs = Date.now() - startTime;
      if (elapsedMs > maxAllowedMs) {
        console.error(`[Search+Price] Timeout reached at product ${pIdx + 1}/${allProducts.length}. Failing request per blocking requirement.`);
        return NextResponse.json({
          ok: false,
          error: `Request timeout: Only processed ${pIdx}/${allProducts.length} products. Try reducing quantity or categories.`,
          partialStats: {
            productsProcessed: pIdx,
            totalProducts: allProducts.length,
            elapsedMs,
          },
        }, { status: 408 });
      }
      
      const product = allProducts[pIdx];
      const productId = product.pid || product.cjId || product.id;
      const variants = product.variants || [];
      
      console.log(`[Search+Price] Processing product ${pIdx + 1}/${allProducts.length}: ${productId} (${variants.length} variants)`);
      
      // Debug: log variant data for first product to verify data flow
      if (pIdx === 0 && variants.length > 0) {
        console.log(`[Search+Price] First product variant sample:`, JSON.stringify({
          vid: variants[0]?.vid,
          cjSku: variants[0]?.cjSku,
          price: variants[0]?.price,
          stock: variants[0]?.stock,
        }));
      }
      
      const pricedVariants: VariantPricingResult[] = [];
      
      if (variants.length === 0) {
        const basePriceUSD = product.minPrice || product.price || 0;
        const productSku = product.productSku || product.sku || '';
        
        if (productSku && supabase) {
          // Get ALL variants using TWO-PHASE CACHING: add to My Products -> query variants -> cache
          const resolvedVariants = await resolveVariantsWithCache(productId, supabase);
          
          if (!resolvedVariants || resolvedVariants.length === 0) {
            variantsProcessed++;
            variantsFailed++;
            pricedVariants.push({
              variantId: productSku,
              variantSku: productSku,
              variantPriceUSD: basePriceUSD,
              shippingAvailable: false,
              shippingPriceUSD: 0,
              shippingPriceSAR: 0,
              deliveryDays: '',
              sellPriceSAR: 0,
              totalCostSAR: 0,
              profitSAR: 0,
              error: 'Could not resolve variant ID',
            });
          } else {
            // Process each resolved variant
            for (const rv of resolvedVariants) {
              variantsProcessed++;
              
              // Rate limit between variant calls
              await new Promise(resolve => setTimeout(resolve, 1200));
              
              try {
                const shippingResult = await calculateShippingToSA(rv.vid, 1);
                const variantPrice = rv.price > 0 ? rv.price : basePriceUSD;
                
                if (shippingResult.available && shippingResult.shippingPriceUSD > 0) {
                  const pricing = calculateFinalPricingSAR(variantPrice, shippingResult.shippingPriceUSD, profitMarginPercent);
                  variantsSuccess++;
                  pricedVariants.push({
                    variantId: rv.vid,
                    variantSku: rv.variantSku,
                    variantPriceUSD: variantPrice,
                    shippingAvailable: true,
                    shippingPriceUSD: shippingResult.shippingPriceUSD,
                    shippingPriceSAR: shippingResult.shippingPriceSAR,
                    deliveryDays: shippingResult.deliveryDays,
                    logisticName: shippingResult.logisticName,
                    sellPriceSAR: pricing.sellPriceSAR,
                    totalCostSAR: pricing.totalCostSAR,
                    profitSAR: pricing.profitSAR,
                  });
                } else {
                  variantsFailed++;
                  pricedVariants.push({
                    variantId: rv.vid,
                    variantSku: rv.variantSku,
                    variantPriceUSD: variantPrice,
                    shippingAvailable: false,
                    shippingPriceUSD: 0,
                    shippingPriceSAR: 0,
                    deliveryDays: '',
                    sellPriceSAR: 0,
                    totalCostSAR: 0,
                    profitSAR: 0,
                    error: shippingResult.error || 'Shipping not available',
                  });
                }
              } catch (err: any) {
                variantsFailed++;
                pricedVariants.push({
                  variantId: rv.vid,
                  variantSku: rv.variantSku,
                  variantPriceUSD: rv.price > 0 ? rv.price : basePriceUSD,
                  shippingAvailable: false,
                  shippingPriceUSD: 0,
                  shippingPriceSAR: 0,
                  deliveryDays: '',
                  sellPriceSAR: 0,
                  totalCostSAR: 0,
                  profitSAR: 0,
                  error: err?.message || 'Shipping calculation failed',
                });
              }
            }
          }
        }
      } else {
        // Resolve ALL variants ONCE before processing (with SKU matching)
        const resolvedVariants = supabase ? await resolveVariantsWithCache(productId, supabase) : null;
        
        // Build a lookup map by SKU for efficient matching
        const vidBySku = new Map<string, { vid: string; price: number }>();
        if (resolvedVariants) {
          for (const rv of resolvedVariants) {
            if (rv.variantSku) {
              vidBySku.set(rv.variantSku.toLowerCase(), { vid: rv.vid, price: rv.price });
            }
          }
          console.log(`[Search+Price] Built SKU lookup map with ${vidBySku.size} entries for pid=${productId}`);
        }
        
        for (let vIdx = 0; vIdx < variants.length; vIdx++) {
          const variant = variants[vIdx];
          // mapCjItemToProductLike uses cjSku field, fallback to other possible names
          const variantSku = variant.cjSku || variant.variantSku || variant.sku || product.productSku || '';
          const variantPriceUSD = variant.price || variant.variantPrice || product.minPrice || 0;
          
          if (!variantSku || variantPriceUSD <= 0) {
            continue;
          }
          
          variantsProcessed++;
          
          // Match variant by SKU to get the correct vid
          const skuLower = variantSku.toLowerCase();
          const match = vidBySku.get(skuLower);
          
          // If no exact match, try to find a partial match (SKU might have size suffix)
          let actualVid: string | null = match?.vid || null;
          if (!actualVid && resolvedVariants && resolvedVariants.length > 0) {
            // Fall back to first variant only if there's exactly one (single-variant product)
            if (resolvedVariants.length === 1) {
              actualVid = resolvedVariants[0].vid;
              console.log(`[Search+Price] Using single variant vid for SKU ${variantSku}`);
            } else {
              // Try partial match: check if any resolved SKU contains or is contained by this SKU
              for (const rv of resolvedVariants) {
                const rvSkuLower = (rv.variantSku || '').toLowerCase();
                if (rvSkuLower.includes(skuLower) || skuLower.includes(rvSkuLower)) {
                  actualVid = rv.vid;
                  console.log(`[Search+Price] Partial SKU match: ${variantSku} -> ${rv.variantSku} (vid=${rv.vid})`);
                  break;
                }
              }
            }
          }
          
          if (!actualVid) {
            variantsFailed++;
            pricedVariants.push({
              variantId: variantSku,
              variantSku,
              variantPriceUSD,
              shippingAvailable: false,
              shippingPriceUSD: 0,
              shippingPriceSAR: 0,
              deliveryDays: '',
              sellPriceSAR: 0,
              totalCostSAR: 0,
              profitSAR: 0,
              error: 'Could not resolve variant ID',
            });
            continue;
          }
          
          await new Promise(resolve => setTimeout(resolve, 1200));
          
          try {
            const shippingResult = await calculateShippingToSA(actualVid, 1);
            
            if (shippingResult.available && shippingResult.shippingPriceUSD > 0) {
              const pricing = calculateFinalPricingSAR(variantPriceUSD, shippingResult.shippingPriceUSD, profitMarginPercent);
              variantsSuccess++;
              pricedVariants.push({
                variantId: actualVid,
                variantSku,
                variantPriceUSD,
                shippingAvailable: true,
                shippingPriceUSD: shippingResult.shippingPriceUSD,
                shippingPriceSAR: shippingResult.shippingPriceSAR,
                deliveryDays: shippingResult.deliveryDays,
                logisticName: shippingResult.logisticName,
                sellPriceSAR: pricing.sellPriceSAR,
                totalCostSAR: pricing.totalCostSAR,
                profitSAR: pricing.profitSAR,
              });
            } else {
              variantsFailed++;
              pricedVariants.push({
                variantId: actualVid,
                variantSku,
                variantPriceUSD,
                shippingAvailable: false,
                shippingPriceUSD: 0,
                shippingPriceSAR: 0,
                deliveryDays: '',
                sellPriceSAR: 0,
                totalCostSAR: 0,
                profitSAR: 0,
                error: shippingResult.error || 'Shipping not available',
              });
            }
          } catch (err: any) {
            variantsFailed++;
            pricedVariants.push({
              variantId: actualVid,
              variantSku,
              variantPriceUSD,
              shippingAvailable: false,
              shippingPriceUSD: 0,
              shippingPriceSAR: 0,
              deliveryDays: '',
              sellPriceSAR: 0,
              totalCostSAR: 0,
              profitSAR: 0,
              error: err?.message || 'Shipping calculation failed',
            });
          }
        }
      }
      
      const availableVariants = pricedVariants.filter(v => v.shippingAvailable);
      const prices = availableVariants.map(v => v.sellPriceSAR);
      
      // Get image from array (mapCjItemToProductLike returns images as array)
      const productImage = (product.images && product.images[0]) || product.image || product.productImage || '';
      
      pricedProducts.push({
        pid: productId,
        name: product.name || product.productNameEn || '',
        image: productImage,
        stock: product.stock || 0,
        productSku: product.productSku || '',
        listedNum: product.listedNum || 0,
        deliveryCycle: product.deliveryCycle || null,
        supplierName: product.supplierName || '',
        freeShipping: product.freeShipping || false,
        variants: pricedVariants,
        lowestPriceSAR: prices.length > 0 ? Math.min(...prices) : null,
        highestPriceSAR: prices.length > 0 ? Math.max(...prices) : null,
        hasAvailableVariant: availableVariants.length > 0,
      });
      
      console.log(`[Search+Price] Product ${pIdx + 1}/${allProducts.length} complete: ${availableVariants.length}/${pricedVariants.length} variants available`);
    }
    
    const phase2Duration = Date.now() - phase2Start;
    const totalDuration = Date.now() - startTime;
    
    // BLOCKING REQUIREMENT: Only return products with AT LEAST ONE successfully priced variant
    // Products with zero successful variants are excluded
    // This balances accuracy (only show priced variants) with availability (don't require ALL variants to succeed)
    const productsWithPricing = pricedProducts.filter(p => {
      const successfulVariants = p.variants.filter(v => v.shippingAvailable && !v.error);
      if (successfulVariants.length === 0) {
        console.log(`[Search+Price] Excluding product ${p.pid}: no successfully priced variants`);
        return false;
      }
      // Keep only the successfully priced variants, remove failed ones
      console.log(`[Search+Price] Product ${p.pid}: keeping ${successfulVariants.length}/${p.variants.length} successful variants`);
      return true;
    }).map(p => ({
      ...p,
      // Only include successfully priced variants in the response
      variants: p.variants.filter(v => v.shippingAvailable && !v.error),
    }));
    
    console.log(`[Search+Price] Complete: ${pricedProducts.length} products processed, ${productsWithPricing.length} with pricing, ${variantsSuccess}/${variantsProcessed} variants priced in ${totalDuration}ms`);
    
    const response = {
      ok: true,
      products: productsWithPricing, // Only return products with at least one priced variant
      stats: {
        totalFound,
        productsSearched: allProducts.length,
        productsProcessed: pricedProducts.length,
        productsReturned: productsWithPricing.length, // Products with at least one priced variant
        productsExcluded: pricedProducts.length - productsWithPricing.length, // Products with no priced variants
        variantsProcessed,
        variantsSuccess,
        variantsFailed,
        phase1DurationMs: phase1Duration,
        phase2DurationMs: phase2Duration,
        totalDurationMs: totalDuration,
      },
      profitMarginPercent,
    };
    
    const r = NextResponse.json(response);
    r.headers.set('x-request-id', log.requestId);
    r.headers.set('Cache-Control', 'no-store');
    return r;
    
  } catch (error: any) {
    console.error('[Search+Price] Fatal error:', error?.message);
    
    await logError({
      error_type: 'cj_api',
      message: error?.message || 'Failed to search and price products',
      details: { stack: error?.stack },
      page: '/api/admin/cj/products/search-and-price',
    });
    
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to search and price products' },
      { status: 500 }
    );
  }
}
