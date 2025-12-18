import { NextResponse } from 'next/server';
import { getAccessToken, freightCalculate, fetchProductDetailsBatch, getProductRatings, findCJPacketOrdinary, getInventoryByPid, queryVariantInventory, waitForCjRateLimit } from '@/lib/cj/v2';
import { ensureAdmin } from '@/lib/auth/admin-guard';
import { fetchJson } from '@/lib/http';
import { loggerForRequest } from '@/lib/log';
import { usdToSar, computeRetailFromLanded } from '@/lib/pricing';
import { updateJobProgress } from '@/lib/db/search-jobs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

type ShippingOption = {
  name: string;
  code: string;
  priceUSD: number;
  deliveryDays: string;
};

type PricedVariant = {
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
  stock?: number;
  cjStock?: number;          // CJ warehouse stock (verified)
  factoryStock?: number;     // Factory/supplier stock (unverified)
  variantName?: string;
  variantImage?: string;
  size?: string;
  color?: string;
  allShippingOptions?: ShippingOption[];
};

type WarehouseStock = {
  areaId: number;
  areaName: string;
  countryCode: string;
  totalInventory: number;
  cjInventory: number;
  factoryInventory: number;
};

type ProductInventory = {
  totalCJ: number;
  totalFactory: number;
  totalAvailable: number;
  warehouses: WarehouseStock[];
};

type InventoryVariant = {
  variantId: string;
  sku: string;
  shortName: string;
  priceUSD: number;
  cjStock: number;
  factoryStock: number;
  totalStock: number;
};

type PricedProduct = {
  pid: string;
  cjSku: string;
  name: string;
  images: string[];
  minPriceSAR: number;
  maxPriceSAR: number;
  avgPriceSAR: number;
  stock: number;
  listedNum: number;
  // Inventory breakdown from CJ's dedicated inventory API
  totalVerifiedInventory?: number;    // CJ warehouse stock (verified)
  totalUnVerifiedInventory?: number;  // Factory/supplier stock (unverified)
  // Full warehouse inventory object for detailed display
  inventory?: ProductInventory;
  // Inventory status: 'ok' = successfully fetched, 'error' = failed to fetch, 'partial' = some data missing
  inventoryStatus?: 'ok' | 'error' | 'partial';
  inventoryErrorMessage?: string;
  variants: PricedVariant[];
  inventoryVariants?: InventoryVariant[];
  successfulVariants: number;
  totalVariants: number;
  description?: string;
  overview?: string;
  productInfo?: string;
  sizeInfo?: string;
  productNote?: string;
  packingList?: string;
  rating?: number;
  reviewCount?: number;
  categoryName?: string;
  productWeight?: number;
  packLength?: number;
  packWidth?: number;
  packHeight?: number;
  material?: string;
  productType?: string;
  sizeChartImages?: string[];
  processingTimeHours?: number;
  deliveryTimeHours?: number;
  estimatedProcessingDays?: string;
  estimatedDeliveryDays?: string;
  originCountry?: string;
  hsCode?: string;
  videoUrl?: string;
  availableSizes?: string[];
  availableColors?: string[];
  availableModels?: string[];
};

async function fetchCjProductPage(
  token: string, 
  base: string, 
  categoryId: string | null,
  pageNum: number
): Promise<{ list: any[]; total: number }> {
  // Use /product/list for category filtering (stable and reliable)
  const params = new URLSearchParams();
  params.set('pageNum', String(pageNum));
  
  if (categoryId && categoryId !== 'all' && !categoryId.startsWith('first-') && !categoryId.startsWith('second-')) {
    params.set('categoryId', categoryId);
  }
  
  const url = `${base}/product/list?${params}`;
  console.log(`[Search&Price] Fetching product/list: ${url}`);
  
  try {
    const res = await fetchJson<any>(url, {
      headers: {
        'CJ-Access-Token': token,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      timeoutMs: 30000,
    });
    
    const list = res?.data?.list || [];
    const total = res?.data?.total || 0;
    console.log(`[Search&Price] Page ${pageNum} returned ${list.length} items (total: ${total})`);
    
    return { list, total };
  } catch (e: any) {
    console.error(`[Search&Price] Fetch error:`, e?.message);
    return { list: [], total: 0 };
  }
}

// Fetch inventory data from listV2 by PID keyword search
async function enrichWithListV2Inventory(
  token: string,
  base: string, 
  pid: string
): Promise<{ warehouseInventoryNum?: number; listedNum?: number; totalVerifiedInventory?: number; totalUnVerifiedInventory?: number } | null> {
  try {
    const url = `${base}/product/listV2?keyWord=${encodeURIComponent(pid)}&page=1&size=5&features=enable_description`;
    const res = await fetchJson<any>(url, {
      headers: {
        'CJ-Access-Token': token,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      timeoutMs: 10000,
    });
    
    // Extract product list from response
    const data = res?.data;
    let productList: any[] = [];
    if (Array.isArray(data)) {
      productList = data;
    } else if (data?.list) {
      productList = data.list;
    } else if (data?.products) {
      productList = data.products;
    }
    
    // Find matching product by PID
    const match = productList.find((p: any) => p.id === pid || p.pid === pid);
    if (match) {
      return {
        warehouseInventoryNum: Number(match.warehouseInventoryNum || 0),
        listedNum: Number(match.listedNum || 0),
        totalVerifiedInventory: Number(match.totalVerifiedInventory || 0),
        totalUnVerifiedInventory: Number(match.totalUnVerifiedInventory || 0),
      };
    }
    return null;
  } catch (e: any) {
    console.log(`[Search&Price] listV2 enrichment failed for ${pid}:`, e?.message);
    return null;
  }
}

async function getVariantsForProduct(token: string, base: string, pid: string): Promise<any[]> {
  try {
    const res = await fetchJson<any>(`${base}/product/variant/query?pid=${encodeURIComponent(pid)}`, {
      headers: {
        'CJ-Access-Token': token,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      timeoutMs: 15000,
    });
    const data = res?.data;
    const variants = Array.isArray(data) ? data : (data?.list || data?.variants || []);
    
    // Log first variant to see what fields are available
    if (variants.length > 0) {
      const sample = variants[0];
      const keys = Object.keys(sample);
      const imageKeys = keys.filter(k => /image|img|photo|pic/i.test(k));
      console.log(`[Variants] Product ${pid}: ${variants.length} variants`);
      console.log(`[Variants] ALL fields: [${keys.join(', ')}]`);
      console.log(`[Variants] Image fields: [${imageKeys.join(', ')}]`);
      
      // Log actual values for image fields
      for (const k of imageKeys) {
        const val = sample[k];
        if (val) {
          console.log(`[Variants] ${k} = ${typeof val === 'string' ? val.slice(0, 100) : JSON.stringify(val).slice(0, 100)}`);
        }
      }
      
      // Log shipping-critical fields: vid is needed for "According to Shipping Method" freight calculation
      console.log(`[Variants] vid = ${sample.vid || 'NOT_FOUND'}`);
      console.log(`[Variants] variantSku = ${sample.variantSku || 'NOT_FOUND'}`);
      if (sample.variantKey) console.log(`[Variants] variantKey = ${sample.variantKey}`);
      if (sample.variantNameEn) console.log(`[Variants] variantNameEn = ${sample.variantNameEn}`);
    }
    
    return variants;
  } catch (e: any) {
    console.log(`[Variants] Error for ${pid}:`, e?.message);
    return [];
  }
}

function calculateSellPriceWithMargin(landedCostSAR: number, profitMarginPercent: number): number {
  const margin = profitMarginPercent / 100;
  return computeRetailFromLanded(landedCostSAR, { margin });
}

function extractAllImages(item: any): string[] {
  if (!item) return [];
  
  const imageList: string[] = [];
  const seen = new Set<string>();
  
  const pushUrl = (val: any, source?: string) => {
    if (typeof val === 'string' && val.trim()) {
      const url = val.trim();
      // Must look like a valid image URL
      if (url.startsWith('http') && !seen.has(url)) {
        seen.add(url);
        imageList.push(url);
      }
    }
  };
  
  // Main image fields
  const mainFields = ['productImage', 'bigImage', 'image', 'mainImage', 'mainImageUrl'];
  for (const field of mainFields) {
    pushUrl(item[field], `main.${field}`);
  }
  
  // Array fields containing images
  const arrFields = ['imageList', 'productImageList', 'detailImageList', 'pictureList', 'productImages'];
  for (const key of arrFields) {
    const arr = item[key];
    if (Array.isArray(arr)) {
      for (const it of arr) {
        if (typeof it === 'string') pushUrl(it, `arr.${key}`);
        else if (it && typeof it === 'object') {
          pushUrl(it.imageUrl || it.url || it.imgUrl || it.big || it.origin || it.src, `arr.${key}.obj`);
        }
      }
    }
  }
  
  // Extract color images from productPropertyList (CJ color options)
  const propertyList = item.productPropertyList || item.propertyList || item.productOptions || [];
  if (Array.isArray(propertyList)) {
    for (const prop of propertyList) {
      // Each property may have an image (e.g., color swatch with product image)
      pushUrl(prop?.image || prop?.imageUrl || prop?.propImage || prop?.optionImage, 'prop');
      
      // Property values may also have images
      const propValues = prop?.propertyValueList || prop?.values || prop?.options || [];
      if (Array.isArray(propValues)) {
        for (const pv of propValues) {
          pushUrl(pv?.image || pv?.imageUrl || pv?.propImage || pv?.bigImage, 'propValue');
        }
      }
    }
  }
  
  // Variants may have images too - comprehensive extraction
  const variantList = item.variantList || item.skuList || item.variants || [];
  if (Array.isArray(variantList)) {
    for (const v of variantList) {
      // Standard variant image fields
      pushUrl(v?.whiteImage, 'variant.whiteImage');
      pushUrl(v?.image, 'variant.image');
      pushUrl(v?.imageUrl, 'variant.imageUrl');
      pushUrl(v?.imgUrl, 'variant.imgUrl');
      pushUrl(v?.variantImage, 'variant.variantImage');
      pushUrl(v?.attributeImage, 'variant.attributeImage');
      pushUrl(v?.skuImage, 'variant.skuImage');
      pushUrl(v?.bigImage, 'variant.bigImage');
      pushUrl(v?.originImage, 'variant.originImage');
      pushUrl(v?.mainImage, 'variant.mainImage');
      
      // Variant image list/array
      const variantImages = v?.variantImageList || v?.skuImageList || v?.imageList || [];
      if (Array.isArray(variantImages)) {
        for (const vi of variantImages) {
          if (typeof vi === 'string') pushUrl(vi, 'variantArr');
          else if (vi && typeof vi === 'object') {
            pushUrl(vi.image || vi.big || vi.small || vi.url || vi.imageUrl, 'variantArr.obj');
          }
        }
      }
      
      // Variant properties with images (color-specific images)
      const variantProps = v?.variantPropertyList || v?.propertyList || [];
      if (Array.isArray(variantProps)) {
        for (const vp of variantProps) {
          pushUrl(vp?.image || vp?.propImage || vp?.imageUrl, 'variantProp');
        }
      }
    }
  }
  
  // Deep scan: look for any URL-like strings in the entire object
  // This catches any image fields we might have missed
  const deepScan = (obj: any, depth: number = 0) => {
    if (depth > 3 || !obj || typeof obj !== 'object') return;
    
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      // Look for keys that contain 'image' or 'img' or 'photo' or 'pic'
      if (/image|img|photo|pic/i.test(key)) {
        if (typeof val === 'string') {
          pushUrl(val, `deep.${key}`);
        } else if (Array.isArray(val)) {
          for (const v of val) {
            if (typeof v === 'string') pushUrl(v, `deep.${key}[]`);
            else if (v && typeof v === 'object') {
              pushUrl(v.url || v.src || v.imageUrl || v.image, `deep.${key}[].obj`);
            }
          }
        }
      } else if (Array.isArray(val)) {
        for (const v of val) {
          deepScan(v, depth + 1);
        }
      } else if (typeof val === 'object') {
        deepScan(val, depth + 1);
      }
    }
  };
  
  deepScan(item);
  
  // Filter out non-product images (badges, icons, etc.)
  const deny = /(sprite|icon|favicon|logo|placeholder|blank|loading|alipay|wechat|whatsapp|kefu|service|avatar|thumb|thumbnail|small|tiny|mini|sizechart|size\s*chart|chart|table|guide|tips|hot|badge|flag|promo|banner|sale|discount|qr)/i;
  
  const finalImages = imageList.filter(url => !deny.test(url)).slice(0, 50);
  console.log(`[ExtractImages] Found ${imageList.length} raw images, ${finalImages.length} after filtering`);
  
  return finalImages;
}

export async function GET(req: Request) {
  const log = loggerForRequest(req);
  try {
    const guard = await ensureAdmin();
    if (!guard.ok) {
      const r = NextResponse.json(
        { ok: false, error: guard.reason }, 
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
      r.headers.set('x-request-id', log.requestId);
      return r;
    }

    const { searchParams } = new URL(req.url);
    const categoryIdsParam = searchParams.get('categoryIds') || 'all';
    const rawCategoryIds = categoryIdsParam.split(',').filter(Boolean);
    
    // Filter out fake category IDs (first-*, second-*) - only real CJ categoryIds work
    // These fake IDs come from our categories API for display purposes only
    const fakePrefixes = ['first-', 'second-'];
    const fakeIds = rawCategoryIds.filter(id => fakePrefixes.some(p => id.startsWith(p)));
    const categoryIds = rawCategoryIds.filter(id => !fakePrefixes.some(p => id.startsWith(p)));
    
    // If user only selected parent categories (fake IDs), return helpful error
    if (categoryIds.length === 0 && fakeIds.length > 0) {
      console.log(`[Search&Price] Rejected fake category IDs: ${fakeIds.join(', ')}`);
      const r = NextResponse.json({
        ok: false,
        error: 'Please select a specific subcategory (feature) to search. Main categories like "Women\'s Clothing" are too broad - select a specific type like "Blazers" or "Dresses" from the Features dropdown.',
      }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
      r.headers.set('x-request-id', log.requestId);
      return r;
    }
    
    // Log if some fake IDs were filtered out
    if (fakeIds.length > 0) {
      console.log(`[Search&Price] Filtered out fake IDs: ${fakeIds.join(', ')}, using: ${categoryIds.join(', ')}`);
    }
    
    const quantity = Math.max(1, Math.min(1000, Number(searchParams.get('quantity') || 50)));
    const minPrice = Number(searchParams.get('minPrice') || 0);
    const maxPrice = Number(searchParams.get('maxPrice') || 1000);
    const minStock = Number(searchParams.get('minStock') || 0);
    const profitMargin = Math.max(1, Number(searchParams.get('profitMargin') || 8));
    const popularity = searchParams.get('popularity') || 'any';
    const minRating = searchParams.get('minRating') || 'any';
    const freeShippingOnly = searchParams.get('freeShippingOnly') === '1';
    const shippingMethod = searchParams.get('shippingMethod') || 'any';
    const sizesParam = searchParams.get('sizes') || '';
    const jobId = searchParams.get('jobId') || null;
    
    // Helper to update job progress in database (for background jobs)
    const updateProgress = async (foundCount: number, processedCount: number, message: string) => {
      if (jobId) {
        try {
          await updateJobProgress(jobId, foundCount, processedCount, message);
        } catch (e) {
          console.error('[Search&Price] Failed to update job progress:', e);
        }
      }
    };
    
    // Rating estimation function (same algorithm as preview)
    function calculateEstimatedRating(listedNum: number): number {
      if (listedNum >= 2000) return 4.8;
      if (listedNum >= 1000) return 4.7;
      if (listedNum >= 500) return 4.5;
      if (listedNum >= 200) return 4.3;
      if (listedNum >= 100) return 4.2;
      if (listedNum >= 50) return 4.0;
      if (listedNum >= 20) return 3.9;
      return 3.8;
    }
    const requestedSizes = sizesParam ? sizesParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : [];

    console.log(`[Search&Price] ========================================`);
    console.log(`[Search&Price] Starting search with params:`);
    console.log(`[Search&Price]   categories: ${categoryIds.join(',')}`);
    console.log(`[Search&Price]   quantity: ${quantity}`);
    console.log(`[Search&Price]   price range: $${minPrice} - $${maxPrice}`);
    console.log(`[Search&Price]   minStock: ${minStock}`);
    console.log(`[Search&Price]   popularity: ${popularity}`);
    console.log(`[Search&Price]   minRating: ${minRating}`);
    console.log(`[Search&Price]   profitMargin: ${profitMargin}%`);
    console.log(`[Search&Price]   shippingMethod: ${shippingMethod}`);
    console.log(`[Search&Price]   sizes filter: ${requestedSizes.length > 0 ? requestedSizes.join(',') : 'none'}`);
    console.log(`[Search&Price] ========================================`);

    const token = await getAccessToken();
    if (!token) {
      console.error('[Search&Price] Failed to get access token');
      return NextResponse.json(
        { ok: false, error: 'Failed to authenticate with CJ API' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    
    const base = process.env.CJ_API_BASE || 'https://developers.cjdropshipping.com/api2.0/v1';
    
    const candidateProducts: any[] = [];
    const seenPids = new Set<string>();
    const startTime = Date.now();
    // On Replit we have much longer timeouts than Vercel
    // Allow up to 10 minutes for large searches
    const maxDurationMs = 10 * 60 * 1000; // 10 minutes
    console.log(`[Search&Price] Timeout set to ${maxDurationMs/1000}s`);
    
    let totalFiltered = { price: 0, stock: 0, popularity: 0, rating: 0 };
    
    // Track the last page fetched per category (for pagination in batch phase)
    const pagesPerCategory = new Map<string, number>();
    const categoryExhausted = new Map<string, boolean>(); // Track which categories have no more pages
    categoryIds.forEach(catId => {
      pagesPerCategory.set(catId, 0);
      categoryExhausted.set(catId, false);
    });
    
    for (const catId of categoryIds) {
      if (candidateProducts.length >= quantity * 2) break;
      if (Date.now() - startTime > maxDurationMs) {
        console.log(`[Search&Price] Timeout reached`);
        break;
      }
      
      console.log(`[Search&Price] Searching category: ${catId}`);
      
      const maxPages = 50;
      
      for (let page = 1; page <= maxPages; page++) {
        if (Date.now() - startTime > maxDurationMs) break;
        if (candidateProducts.length >= quantity * 2) break;
        
        // Track the page we're fetching
        pagesPerCategory.set(catId, page);
        
        const pageResult = await fetchCjProductPage(token, base, catId, page);
        
        if (pageResult.list.length === 0) {
          console.log(`[Search&Price] No more products at page ${page} for category ${catId}`);
          categoryExhausted.set(catId, true);
          break;
        }
        
        for (const item of pageResult.list) {
          const pid = String(item.pid || item.productId || '');
          if (!pid || seenPids.has(pid)) continue;
          seenPids.add(pid);
          
          const sellPrice = Number(item.sellPrice || item.price || 0);
          if (sellPrice < minPrice || sellPrice > maxPrice) {
            totalFiltered.price++;
            continue;
          }
          
          // NOTE: /product/list doesn't return stock/listedNum data
          // We'll fetch inventory from listV2 during processing phase
          // Skip early filtering on stock/popularity here - do it after enrichment
          
          candidateProducts.push(item);
        }
      }
    }
    
    console.log(`[Search&Price] Pages fetched per category:`, Object.fromEntries(pagesPerCategory));
    
    console.log(`[Search&Price] ----------------------------------------`);
    console.log(`[Search&Price] Search complete:`);
    console.log(`[Search&Price]   Total candidates: ${candidateProducts.length}`);
    console.log(`[Search&Price]   Filtered by price: ${totalFiltered.price}`);
    console.log(`[Search&Price]   Filtered by stock: ${totalFiltered.stock}`);
    console.log(`[Search&Price]   Filtered by popularity: ${totalFiltered.popularity}`);
    console.log(`[Search&Price]   Filtered by rating: ${totalFiltered.rating}`);
    console.log(`[Search&Price] ----------------------------------------`);
    
    if (candidateProducts.length === 0) {
      console.log(`[Search&Price] No candidates found! Returning empty result.`);
      const r = NextResponse.json({
        ok: true,
        products: [],
        count: 0,
        duration: Date.now() - startTime,
        debug: {
          categoriesSearched: categoryIds,
          totalSeen: seenPids.size,
          filtered: totalFiltered,
        }
      }, { headers: { 'Cache-Control': 'no-store' } });
      r.headers.set('x-request-id', log.requestId);
      return r;
    }
    
    // BATCH PROCESSING: Process candidates in batches until we have enough valid products
    // This ensures we meet the requested quantity even when many products lack CJPacket Ordinary
    const BATCH_SIZE = 10; // Process 10 products at a time
    const MAX_TOTAL_PROCESSED = 500; // Safety limit: never process more than 500 products
    
    const pricedProducts: PricedProduct[] = [];
    let skippedNoVariants = 0;
    const shippingErrors: Record<string, number> = {}; // Track error reasons
    let productIndex = 0;
    let candidateIndex = 0; // Track position in candidateProducts
    let consecutiveRateLimitErrors = 0; // Track consecutive rate limit errors to detect real quota issues
    // Use pagesPerCategory and categoryExhausted from initial crawl (already defined above)
    
    console.log(`[Search&Price] Starting batch processing. Target: ${quantity} products, batch size: ${BATCH_SIZE}`);
    
    // Main loop: keep processing until we have enough valid products
    while (pricedProducts.length < quantity && productIndex < MAX_TOTAL_PROCESSED) {
      // Check timeout
      if (Date.now() - startTime > maxDurationMs) {
        console.log(`[Search&Price] Timeout reached with ${pricedProducts.length} valid products`);
        break;
      }
      
      // Check if all categories are exhausted
      const allExhausted = categoryIds.every(catId => categoryExhausted.get(catId) === true);
      
      // Calculate how many more products we need
      const remainingNeeded = quantity - pricedProducts.length;
      const candidatesRemaining = candidateProducts.length - candidateIndex;
      
      // Fetch more pages if:
      // 1. We've exhausted current candidates, OR
      // 2. We're running low on candidates (less than 2x what we still need) and there are more pages
      const shouldFetchMore = (candidateIndex >= candidateProducts.length) || 
                              (candidatesRemaining < remainingNeeded * 2 && !allExhausted);
      
      if (shouldFetchMore && !allExhausted) {
        console.log(`[Search&Price] Need more candidates (${candidatesRemaining} remaining, need ~${remainingNeeded * 2} for ${remainingNeeded} products), fetching round-robin...`);
        
        // ROUND-ROBIN: Fetch one page from EACH non-exhausted category per cycle
        // This ensures all categories are explored fairly, not just draining the first one
        let totalAddedThisCycle = 0;
        let categoriesFetched = 0;
        
        for (const catId of categoryIds) {
          // Check timeout during fetch cycle
          if (Date.now() - startTime > maxDurationMs) {
            console.log(`[Search&Price] Timeout during fetch cycle`);
            break;
          }
          
          // Skip exhausted categories
          if (categoryExhausted.get(catId)) continue;
          
          const currentPageNum = pagesPerCategory.get(catId) || 0;
          const nextPage = currentPageNum + 1;
          
          if (nextPage <= 100) { // Max 100 pages per category
            console.log(`[Search&Price] Round-robin: Fetching page ${nextPage} for category ${catId}`);
            categoriesFetched++;
            
            const pageResult = await fetchCjProductPage(token, base, catId, nextPage);
            pagesPerCategory.set(catId, nextPage);
            
            if (pageResult.list.length === 0) {
              console.log(`[Search&Price] Category ${catId} exhausted at page ${nextPage}`);
              categoryExhausted.set(catId, true);
              continue; // Try next category, don't break
            }
            
            let addedFromPage = 0;
            for (const item of pageResult.list) {
              const pid = String(item.pid || item.productId || '');
              if (!pid || seenPids.has(pid)) continue;
              seenPids.add(pid);
              
              const sellPrice = Number(item.sellPrice || item.price || 0);
              if (sellPrice < minPrice || sellPrice > maxPrice) {
                totalFiltered.price++;
                continue;
              }
              
              candidateProducts.push(item);
              addedFromPage++;
            }
            
            if (addedFromPage > 0) {
              console.log(`[Search&Price] Added ${addedFromPage} candidates from ${catId} page ${nextPage}`);
              totalAddedThisCycle += addedFromPage;
            }
            // NO BREAK - continue to next category for round-robin fairness
          } else {
            categoryExhausted.set(catId, true);
          }
        }
        
        console.log(`[Search&Price] Round-robin cycle complete: fetched ${categoriesFetched} categories, added ${totalAddedThisCycle} candidates`);
        
        // Only exit if truly no more candidates available from any category
        if (totalAddedThisCycle === 0 && categoriesFetched === 0) {
          console.log(`[Search&Price] All categories exhausted, no more candidates available`);
          break;
        }
      }
      
      // If still no candidates available, we're done
      if (candidateIndex >= candidateProducts.length) {
        console.log(`[Search&Price] No more candidates to process`);
        break;
      }
      
      // Get next batch to process
      const batchEnd = Math.min(candidateIndex + BATCH_SIZE, candidateProducts.length);
      const batchItems = candidateProducts.slice(candidateIndex, batchEnd);
      candidateIndex = batchEnd;
      
      console.log(`[Search&Price] Processing batch of ${batchItems.length} products (${pricedProducts.length}/${quantity} valid so far)`);
      
      // Update job progress
      await updateProgress(pricedProducts.length, productIndex, `Processing products... Found ${pricedProducts.length} of ${quantity} requested`);
      
      // Fetch full product details for this batch
      const batchPids = batchItems.map(p => String(p.pid || p.productId || '')).filter(Boolean);
      
      const [productDetailsMap, productRatingsMap] = await Promise.all([
        fetchProductDetailsBatch(batchPids, 5),
        getProductRatings(batchPids)
      ]);
    
    // Process each product in the batch
    for (const item of batchItems) {
      // Check if we already have enough
      if (pricedProducts.length >= quantity) {
        console.log(`[Search&Price] Reached target quantity ${quantity}`);
        break;
      }
      
      productIndex++;
      const pid = String(item.pid || item.productId || '');
      const cjSku = String(item.productSku || item.sku || `CJ-${pid}`);
      const name = String(item.productNameEn || item.name || item.productName || '');
      
      // Get full product details for all images and additional info
      const fullDetails = productDetailsMap.get(pid);
      
      // CRITICAL: Fetch REAL inventory data from CJ's dedicated inventory API
      // This is the ONLY reliable way to get per-warehouse stock breakdown
      // GET /product/stock/getInventoryByPid returns: inventories[].{areaId, areaEn, cjInventoryNum, factoryInventoryNum}
      let realInventory: { 
        totalCJ: number; 
        totalFactory: number; 
        totalAvailable: number; 
        warehouses: Array<{ areaId: number; areaName: string; countryCode: string; totalInventory: number; cjInventory: number; factoryInventory: number }>;
      } | null = null;
      
      // Map to store per-variant inventory with MULTIPLE KEYS for reliable matching
      // Store same stock data under: normalized SKU, vid, variantId, variantKey
      const variantStockMap = new Map<string, { cjStock: number; factoryStock: number; totalStock: number }>();
      
      // Normalize key for matching: lowercase, trim, remove special chars
      const normalizeKey = (s: string | undefined | null): string => {
        if (!s) return '';
        return String(s).toLowerCase().trim().replace(/[\s\-_\.]/g, '');
      };
      
      // Function to look up variant stock by multiple possible keys
      // Uses the SAME normalization as storage
      const getVariantStock = (identifiers: {
        vid?: string;
        variantId?: string;
        sku?: string;
        variantKey?: string;
        variantName?: string;
      }): { cjStock: number; factoryStock: number; totalStock: number } | undefined => {
        // Try ALL possible keys in priority order
        const keysToTry = [
          normalizeKey(identifiers.sku),         // Try SKU first (most common match)
          normalizeKey(identifiers.vid),          // Try vid (variant ID)
          normalizeKey(identifiers.variantId),    // Try variantId
          normalizeKey(identifiers.variantKey),   // Try variantKey (e.g., "White-L")
          normalizeKey(identifiers.variantName),  // Try variant name
        ].filter(k => k.length > 0);
        
        for (const key of keysToTry) {
          const stock = variantStockMap.get(key);
          if (stock) return stock;
        }
        
        // Fallback: scan all stored entries for partial match
        if (keysToTry.length > 0) {
          for (const [storedKey, stockData] of variantStockMap.entries()) {
            for (const searchKey of keysToTry) {
              if (searchKey && (storedKey.includes(searchKey) || searchKey.includes(storedKey))) {
                return stockData;
              }
            }
          }
        }
        
        return undefined;
      };
      
      // Track inventory fetch status for UI feedback
      let inventoryStatus: 'ok' | 'error' | 'partial' = 'ok';
      let inventoryErrorMessage: string | undefined;
      
      // Declare variantInventory outside try block so it's accessible for inventoryVariants building
      let variantInventory: Awaited<ReturnType<typeof queryVariantInventory>> = [];
      
      try {
        // Fetch product-level inventory from dedicated API
        realInventory = await getInventoryByPid(pid);
        if (realInventory) {
          console.log(`[Search&Price] Product ${pid} - Inventory from getInventoryByPid:`);
          console.log(`  - Total: ${realInventory.totalAvailable} (CJ: ${realInventory.totalCJ}, Factory: ${realInventory.totalFactory})`);
          console.log(`  - Warehouses: ${realInventory.warehouses.length}`);
          for (const wh of realInventory.warehouses) {
            console.log(`    - ${wh.areaName}: CJ=${wh.cjInventory}, Factory=${wh.factoryInventory}, Total=${wh.totalInventory}`);
          }
        } else {
          console.log(`[Search&Price] Product ${pid} - No inventory data returned from getInventoryByPid`);
          inventoryStatus = 'partial';
          inventoryErrorMessage = 'Could not fetch warehouse inventory';
        }
        
        // Also fetch per-variant inventory (CJ vs Factory breakdown per variant)
        // This matches CJ's "Inventory Details" modal showing: White-L (CJ:0, Factory:6714), etc.
        // Use shared rate limiter to respect CJ's 1 rps limit across all concurrent requests
        const rateLimitAcquired = await waitForCjRateLimit();
        if (!rateLimitAcquired) {
          console.warn(`[Search&Price] Product ${pid} - Rate limit timeout for queryVariantInventory`);
          inventoryStatus = 'error';
          inventoryErrorMessage = 'Rate limit timeout - too many concurrent requests';
        }
        
        try {
          variantInventory = await queryVariantInventory(pid);
        } catch (e: any) {
          const errorMsg = e?.message || 'Failed to fetch variant inventory';
          console.log(`[Search&Price] Product ${pid} - queryVariantInventory error: ${errorMsg}`);
          inventoryStatus = inventoryStatus === 'ok' ? 'partial' : 'error';
          inventoryErrorMessage = inventoryErrorMessage ? `${inventoryErrorMessage}; ${errorMsg}` : errorMsg;
        }
        if (variantInventory && variantInventory.length > 0) {
          console.log(`[Search&Price] Product ${pid} - Per-variant inventory: ${variantInventory.length} variants`);
          for (const vi of variantInventory) {
            const stockData = {
              cjStock: vi.cjStock,
              factoryStock: vi.factoryStock,
              totalStock: vi.totalStock,
            };
            // Store under ALL possible normalized keys for robust matching
            // This ensures we can match by ANY identifier CJ uses
            const keysToStore = [
              normalizeKey(vi.variantSku),
              normalizeKey(vi.vid),
              normalizeKey(vi.variantId),
              normalizeKey(vi.variantKey),
              normalizeKey(vi.variantName),
            ].filter(k => k && k.length > 0);
            
            for (const key of keysToStore) {
              variantStockMap.set(key, stockData);
            }
            console.log(`    - ${vi.variantName || vi.variantSku}: CJ=${vi.cjStock}, Factory=${vi.factoryStock}, Total=${vi.totalStock} (${keysToStore.length} keys stored)`);
          }
          console.log(`[Search&Price] Product ${pid} - Stored ${variantStockMap.size} total stock keys`);
        } else if (!inventoryErrorMessage) {
          // No variants returned but no error - mark as partial
          inventoryStatus = inventoryStatus === 'ok' ? 'partial' : inventoryStatus;
        }
      } catch (e: any) {
        console.log(`[Search&Price] Product ${pid} - Error fetching inventory: ${e?.message}`);
        inventoryStatus = 'error';
        inventoryErrorMessage = e?.message || 'Failed to fetch inventory data';
      }
      
      // Build inventoryVariants array from ALL variant inventory data
      // This is for the blue Inventory Details box on Page 4 - shows ALL variants
      const inventoryVariants: InventoryVariant[] = [];
      if (variantInventory && variantInventory.length > 0) {
        for (const vi of variantInventory) {
          // Only include variants with stock > 0
          if (vi.totalStock <= 0) continue;
          
          // Parse short name from variantKey or variantName (format: "Black-L", "HA0127-XXL")
          const variantKeyRaw = String(vi.variantKey || vi.variantName || vi.variantSku || '');
          let shortName = variantKeyRaw;
          
          // Clean up the name - remove any Chinese characters
          shortName = shortName.replace(/[\u4e00-\u9fff]/g, '').trim();
          
          // If still empty, use SKU
          if (!shortName) {
            shortName = vi.variantSku || `Variant-${vi.vid || vi.variantId || '?'}`;
          }
          
          inventoryVariants.push({
            variantId: String(vi.vid || vi.variantId || ''),
            sku: vi.variantSku,
            shortName,
            priceUSD: vi.price,
            cjStock: vi.cjStock,
            factoryStock: vi.factoryStock,
            totalStock: vi.totalStock,
          });
        }
        console.log(`[Search&Price] Product ${pid} - Built ${inventoryVariants.length} inventoryVariants for display`);
      }
      
      // Fallback: if no inventoryVariants but we have product-level stock,
      // try to build from product's variant list (from fullDetails or item)
      // IMPORTANT: We show real variant names/prices but mark stock as -1 (unknown)
      // to maintain 100% accuracy - we never fabricate per-variant stock counts
      if (inventoryVariants.length === 0 && (realInventory?.totalAvailable || 0) > 0) {
        const productSource = fullDetails || item;
        const productVariantList = productSource?.variantList || productSource?.skuList || productSource?.variants || [];
        
        if (Array.isArray(productVariantList) && productVariantList.length > 0) {
          // Build inventoryVariants from product's variant list
          // Show real names and prices, but use -1 for stock (indicates "per-variant unknown")
          // The UI can display total stock from product-level data separately
          for (const pv of productVariantList) {
            const sku = pv.variantSku || pv.sku || pv.vid || '';
            // IMPORTANT: variantKey is the SHORT name like "Black And Silver-2XL"
            // variantNameEn is the LONG descriptive name - use as fallback
            const variantKeyShort = pv.variantKey || '';
            const variantNameLong = pv.variantNameEn || pv.variantName || pv.skuName || '';
            const price = Number(pv.variantSellPrice || pv.sellPrice || pv.variantPrice || pv.price || 0);
            const vid = pv.vid || '';
            
            // Parse a clean short name - prioritize variantKey (short) over variantNameEn (long)
            let shortName = variantKeyShort || variantNameLong;
            shortName = shortName.replace(/[\u4e00-\u9fff]/g, '').trim();
            if (!shortName) {
              shortName = sku || `Variant-${vid || '?'}`;
            }
            
            // Use -1 to indicate "per-variant stock unknown" 
            // This maintains accuracy - we don't fabricate numbers
            inventoryVariants.push({
              variantId: vid || sku,
              sku,
              shortName,
              priceUSD: price,
              cjStock: -1,      // Unknown per-variant
              factoryStock: -1, // Unknown per-variant
              totalStock: -1,   // Unknown per-variant
            });
          }
          console.log(`[Search&Price] Product ${pid} - Built ${inventoryVariants.length} inventoryVariants from product variant list (stock marked unknown)`);
        } else {
          // True single-variant product - show actual totals
          inventoryVariants.push({
            variantId: cjSku,
            sku: cjSku,
            shortName: 'Default',
            priceUSD: 0,
            cjStock: realInventory?.totalCJ ?? 0,
            factoryStock: realInventory?.totalFactory ?? 0,
            totalStock: realInventory?.totalAvailable ?? 0,
          });
          console.log(`[Search&Price] Product ${pid} - Used product-level inventory as single inventoryVariant`);
        }
      }
      
      // Use REAL inventory data from dedicated API (most accurate)
      const stock = realInventory?.totalAvailable ?? Number(item.stock || 0);
      const totalVerifiedInventory = realInventory?.totalCJ ?? 0;
      const totalUnVerifiedInventory = realInventory?.totalFactory ?? 0;
      
      // listedNum comes from listV2 or fullDetails - not inventory API
      const listedNum = fullDetails?.listedNum ?? Number(item.listedNum || 0);
      
      console.log(`[Search&Price] Product ${pid} => Final: stock=${stock}, listedNum=${listedNum}, CJ=${totalVerifiedInventory}, Factory=${totalUnVerifiedInventory}`);
      
      let images = extractAllImages(fullDetails || item);
      console.log(`[Search&Price] Product ${pid}: ${images.length} images from details`);
      
      // Extract additional product info from fullDetails or item
      const source = fullDetails || item;
      const rawDescriptionHtml = String(source.description || source.productDescription || source.descriptionEn || source.productDescEn || source.desc || '').trim();
      
      // Get rating from productComments API (reliable source)
      let rating: number | undefined = undefined;
      let reviewCount = 0;
      const ratingData = productRatingsMap.get(pid);
      if (ratingData && ratingData.rating !== null && ratingData.rating !== undefined) {
        // Ensure rating is a number (CJ API may return strings)
        const parsedRating = Number(ratingData.rating);
        if (Number.isFinite(parsedRating) && parsedRating > 0) {
          rating = parsedRating;
          reviewCount = Number(ratingData.reviewCount) || 0;
          console.log(`[Search&Price] Product ${pid}: Rating ${rating} from comments API (${reviewCount} reviews)`);
        } else {
          console.log(`[Search&Price] Product ${pid}: Invalid rating value: ${ratingData.rating}`);
        }
      } else {
        console.log(`[Search&Price] Product ${pid}: No rating available from comments API`);
      }
      
      const categoryName = String(source.categoryName || source.categoryNameEn || source.category || '').trim() || undefined;
      
      // Extract product weight - check all possible CJ field names
      // For shipping, use packWeight (product + packaging) which is what carriers charge for
      // CJ API returns: packWeight/packingWeight (total) and productWeight (net)
      const weightCandidates: Array<{ field: string; value: any }> = [
        { field: 'packWeight', value: source.packWeight },           // Total weight (preferred for shipping)
        { field: 'packingWeight', value: source.packingWeight },     // Same as packWeight
        { field: 'productWeight', value: source.productWeight },     // Net weight only
        { field: 'weight', value: source.weight },                   // Alternative field name
        { field: 'grossWeight', value: source.grossWeight },
        { field: 'netWeight', value: source.netWeight },
      ];
      
      // Find the first valid weight value
      let productWeight: number | undefined = undefined;
      let weightSource = 'none';
      for (const { field, value } of weightCandidates) {
        if (value !== undefined && value !== null && value !== '') {
          const numVal = Number(value);
          if (Number.isFinite(numVal) && numVal > 0) {
            // CJ typically returns weight in grams, but check if it might be kg
            productWeight = numVal < 30 ? Math.round(numVal * 1000) : Math.round(numVal);
            weightSource = field;
            break;
          }
        }
      }
      
      const packLength = source.packLength !== undefined ? Number(source.packLength) : (source.length !== undefined ? Number(source.length) : undefined);
      const packWidth = source.packWidth !== undefined ? Number(source.packWidth) : (source.width !== undefined ? Number(source.width) : undefined);
      const packHeight = source.packHeight !== undefined ? Number(source.packHeight) : (source.height !== undefined ? Number(source.height) : undefined);
      
      // Debug: Log extracted weight/dimensions for shipping calculation accuracy
      console.log(`[Search&Price] Product ${pid} dimensions: weight=${productWeight}g (from ${weightSource}), L=${packLength}cm, W=${packWidth}cm, H=${packHeight}cm`);
      
      // Log all available weight-related fields for debugging if weight not found
      if (!productWeight) {
        const weightFields = Object.entries(source).filter(([k, v]) => 
          /weight/i.test(k) && v !== undefined && v !== null && v !== ''
        );
        if (weightFields.length > 0) {
          console.log(`[Search&Price] Product ${pid} available weight fields: ${JSON.stringify(Object.fromEntries(weightFields))}`);
        }
      }
      const productType = String(source.productType || source.type || source.productTypeName || '').trim() || undefined;
      
      // Helper: Parse CJ JSON array fields like '["","metal"]' into readable string
      const parseCjJsonArray = (val: any): string => {
        if (!val) return '';
        if (Array.isArray(val)) return val.filter(Boolean).map(String).join(', ');
        if (typeof val === 'string') {
          const trimmed = val.trim();
          if (trimmed.startsWith('[')) {
            try {
              const arr = JSON.parse(trimmed);
              if (Array.isArray(arr)) return arr.filter(Boolean).map(String).join(', ');
            } catch {}
          }
          return trimmed;
        }
        return '';
      };
      
      // Try to get material - first try parsed arrays (from fullDetails), then raw field, then parse locally
      let material = source.materialParsed || '';
      if (!material) {
        const rawMaterial = source.material || source.productMaterial || source.materialNameEn || source.materialName || '';
        material = parseCjJsonArray(rawMaterial);
      }
      material = material.trim() || undefined;
      
      // Try to get packing info similarly
      let packingInfo = source.packingParsed || '';
      if (!packingInfo) {
        const rawPacking = source.packingNameEn || source.packingName || source.packingList || '';
        packingInfo = parseCjJsonArray(rawPacking);
      }
      packingInfo = packingInfo.trim() || undefined;
      
      // Helper: Sanitize HTML - remove supplier links/contacts but keep usable content
      const sanitizeHtml = (html: string): string | undefined => {
        if (!html || typeof html !== 'string') return undefined;
        let cleaned = html
          // Remove 1688.com and other supplier links
          .replace(/<a[^>]*href=[^>]*(1688|taobao|alibaba|aliexpress|tmall)[^>]*>.*?<\/a>/gi, '')
          .replace(/https?:\/\/[^\s<>"]*?(1688|taobao|alibaba|aliexpress|tmall)[^\s<>"]*/gi, '')
          // Remove WeChat/QQ/supplier contact info
          .replace(/<[^>]*>(.*?(微信|QQ|联系|客服|淘宝|阿里巴巴|天猫|拼多多|抖音|快手).*?)<\/[^>]*>/gi, '')
          // Remove emoji patterns
          .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
          // Remove empty elements
          .replace(/<(\w+)[^>]*>\s*<\/\1>/g, '')
          // Remove multiple whitespace and line breaks
          .replace(/\s+/g, ' ')
          .trim();
        
        // Check if remaining content has any useful content
        const textOnly = cleaned.replace(/<[^>]*>/g, '').trim();
        const hasEnglish = /[a-zA-Z]/.test(textOnly); // Single letter is enough
        const hasArabic = /[\u0600-\u06FF]/.test(textOnly);
        const hasNumbers = /\d/.test(textOnly);
        const hasUnits = /\b(cm|mm|m|kg|g|ml|l|inch|oz|lb)\b/i.test(textOnly);
        
        // If no useful content remains, return undefined
        if (!hasEnglish && !hasArabic && !hasNumbers && textOnly.length === 0) return undefined;
        
        // Accept content if it has numbers or units (likely specs) even if Chinese-heavy
        if (hasNumbers || hasUnits) {
          return cleaned.length > 0 ? cleaned : undefined;
        }
        
        // For pure text, if >90% Chinese with no English, skip it
        const chineseChars = (textOnly.match(/[\u4e00-\u9fff]/g) || []).length;
        if (textOnly.length > 0 && !hasEnglish && !hasArabic && chineseChars > textOnly.length * 0.9) return undefined;
        
        // Return cleaned content if it has any text
        return cleaned.length > 0 ? cleaned : undefined;
      };
      
      // Helper: Build product info from productPropertyList if description is empty
      // CJ propertyList structure: { propertyName, propertyNameEn, propertyValueList: [{propertyValueName, propertyValueNameEn}] }
      const buildInfoFromProperties = (props: any[]): string => {
        if (!Array.isArray(props) || props.length === 0) return '';
        const lines: string[] = [];
        
        // Helper to clean a value - strip pure Chinese, keep mixed/numeric content
        const cleanValue = (val: string): string => {
          if (!val) return '';
          const trimmed = val.trim();
          // If it has numbers or units, keep it even with Chinese
          if (/\d/.test(trimmed) || /\b(cm|mm|m|kg|g|ml|l|inch|oz|lb|pcs|pc|set)\b/i.test(trimmed)) {
            // Remove pure Chinese segments but keep numbers and English
            return trimmed.replace(/^[\u4e00-\u9fff\s]+(?=\d)/g, '').replace(/[\u4e00-\u9fff]+$/g, '').trim();
          }
          // If it has English letters, keep it
          if (/[a-zA-Z]/.test(trimmed)) {
            return trimmed;
          }
          // Pure Chinese with no useful content
          return '';
        };
        
        for (const prop of props) {
          // Try EN name first, then fallback to base name
          let name = String(prop.propertyNameEn || '').trim();
          if (!name) {
            name = String(prop.propertyName || prop.name || prop.key || '').trim();
            // Skip if name is pure Chinese
            if (/^[\u4e00-\u9fff\s]+$/.test(name)) continue;
          }
          if (!name) continue;
          
          // Handle nested propertyValueList array (common CJ structure)
          const valueList = prop.propertyValueList || prop.values || prop.options || [];
          if (Array.isArray(valueList) && valueList.length > 0) {
            const values: string[] = [];
            for (const v of valueList) {
              // Try multiple value fields with fallbacks
              const raw = String(v.propertyValueNameEn || v.propertyValueName || v.valueNameEn || v.valueName || v.name || v.value || '').trim();
              const cleaned = cleanValue(raw);
              if (cleaned) {
                values.push(cleaned);
              }
            }
            if (values.length > 0) {
              lines.push(`${name}: ${values.join(', ')}`);
            }
          } else {
            // Handle scalar value (fallback) - try multiple fields
            const raw = String(prop.propertyValueNameEn || prop.propertyValueName || prop.propertyValue || prop.value || prop.valueName || '').trim();
            const cleaned = cleanValue(raw);
            if (cleaned) {
              lines.push(`${name}: ${cleaned}`);
            }
          }
        }
        return lines.join('<br/>');
      };
      
      // Helper: Extract specs from HTML description (tables, lists, key:value patterns)
      const extractSpecsFromHtml = (html: string): string => {
        if (!html || typeof html !== 'string') return '';
        const lines: string[] = [];
        
        // Remove supplier junk first
        let cleaned = html
          .replace(/<a[^>]*href=[^>]*(1688|taobao|alibaba|aliexpress|tmall)[^>]*>.*?<\/a>/gi, '')
          .replace(/https?:\/\/[^\s<>"]*?(1688|taobao|alibaba|aliexpress|tmall)[^\s<>"]*/gi, '')
          .replace(/<[^>]*>(.*?(微信|QQ|联系|客服|淘宝|阿里巴巴).*?)<\/[^>]*>/gi, '');
        
        // Extract key:value patterns like "Material: Cotton" or "Size: S-XL"
        const kvPatterns = cleaned.match(/([A-Za-z][A-Za-z\s]{2,30})[\s]*[:\-：][\s]*([A-Za-z0-9][A-Za-z0-9\s,.\-\/×xX%]+)/g) || [];
        for (const kv of kvPatterns) {
          const match = kv.match(/([A-Za-z][A-Za-z\s]{2,30})[\s]*[:\-：][\s]*(.+)/);
          if (match && match[1] && match[2]) {
            const key = match[1].trim();
            const value = match[2].trim();
            // Skip if mostly Chinese in value
            const chineseChars = (value.match(/[\u4e00-\u9fff]/g) || []).length;
            if (chineseChars < value.length * 0.5 && value.length > 1) {
              lines.push(`${key}: ${value}`);
            }
          }
        }
        
        // Extract from <li> items that look like specs
        const liItems = cleaned.match(/<li[^>]*>([^<]+)<\/li>/gi) || [];
        for (const li of liItems) {
          const text = li.replace(/<[^>]*>/g, '').trim();
          // Must have English letters and not be too long
          if (/[a-zA-Z]/.test(text) && text.length > 3 && text.length < 100) {
            const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
            if (chineseChars < text.length * 0.3) {
              lines.push(text);
            }
          }
        }
        
        // Deduplicate
        const seen = new Set<string>();
        const uniqueLines: string[] = [];
        for (const line of lines) {
          const normalized = line.toLowerCase().replace(/\s+/g, ' ');
          if (!seen.has(normalized)) {
            seen.add(normalized);
            uniqueLines.push(line);
          }
        }
        
        return uniqueLines.slice(0, 20).join('<br/>');
      };
      
      // Helper: Build basic specs from product fields (only meaningful customer-facing data)
      const buildBasicSpecs = (): string => {
        const specs: string[] = [];
        if (material && material.length > 1) specs.push(`Material: ${material}`);
        if (packingInfo && packingInfo.length > 1) specs.push(`Package: ${packingInfo}`);
        if (productWeight && productWeight > 0) specs.push(`Weight: ${productWeight}g`);
        if (packLength && packWidth && packHeight) {
          specs.push(`Package Size: ${packLength} × ${packWidth} × ${packHeight} cm`);
        }
        // Add delivery cycle if available
        const deliveryCycle = source.deliveryCycle;
        if (deliveryCycle) {
          specs.push(`Delivery: ${deliveryCycle} days`);
        }
        // Only include category if we have other specs too
        if (specs.length > 0 && categoryName && !categoryName.includes('_')) {
          specs.push(`Category: ${categoryName}`);
        }
        return specs.join('<br/>');
      };
      
      // Sanitize the description HTML (apply after sanitizeHtml is defined)
      const description = sanitizeHtml(rawDescriptionHtml);
      
      // Extract Product Information - check multiple sources
      let rawProductInfo = String(source.description || source.productDescription || source.descriptionEn || source.productDescEn || source.desc || '').trim();
      const descriptionHtml = rawProductInfo; // Save for later extraction
      
      // First try productPropertyList (best quality specs)
      const propList = source.productPropertyList || source.propertyList || source.properties || source.specs || source.attributes || [];
      const propsInfo = buildInfoFromProperties(propList);
      if (propsInfo && propsInfo.length > 10) {
        rawProductInfo = propsInfo;
      }
      
      // If no specs from property list, try to extract from HTML description
      if (!rawProductInfo || rawProductInfo.length < 10) {
        const htmlSpecs = extractSpecsFromHtml(descriptionHtml);
        if (htmlSpecs && htmlSpecs.length > 10) {
          rawProductInfo = htmlSpecs;
        }
      }
      
      // If still nothing, check nested data structures
      if (!rawProductInfo || rawProductInfo.length < 10) {
        const nested = source.data || source.product || source.detail || source.info || {};
        if (typeof nested === 'object') {
          const nestedDesc = String(nested.description || nested.productDescription || nested.descriptionEn || '').trim();
          if (nestedDesc) {
            const nestedSpecs = extractSpecsFromHtml(nestedDesc);
            if (nestedSpecs && nestedSpecs.length > 10) {
              rawProductInfo = nestedSpecs;
            }
          }
        }
      }
      
      // Try synthesizedInfo from fetchProductDetailsByPid (contains parsed material, packing, weight, etc.)
      if (!rawProductInfo || rawProductInfo.length < 10) {
        if (source.synthesizedInfo) {
          rawProductInfo = source.synthesizedInfo;
          console.log(`[Search&Price] Product ${pid}: Using synthesizedInfo as productInfo fallback`);
        }
      }
      
      // Last resort: build basic specs from known fields
      if (!rawProductInfo || rawProductInfo.length < 10) {
        const basicSpecs = buildBasicSpecs();
        if (basicSpecs) {
          rawProductInfo = basicSpecs;
        }
      }
      
      const productInfo = sanitizeHtml(rawProductInfo);
      
      // Extract Product Note (sizing/color notes from CJ) - heavily sanitize
      const rawProductNote = String(source.productNote || source.note || source.notes || source.remark || source.memo || source.comment || source.remarkEn || '').trim();
      const productNote = sanitizeHtml(rawProductNote);
      
      // Extract Packing List - check multiple field names
      let rawPackingList = String(source.packingList || source.packing || source.packageContent || source.packageList || source.packingNameEn || source.packingName || source.packageInfo || '').trim();
      
      // If packingList is empty, check if it's in a nested structure or property list
      if (!rawPackingList) {
        const propList = source.productPropertyList || source.propertyList || [];
        if (Array.isArray(propList)) {
          for (const prop of propList) {
            const name = String(prop.propertyNameEn || prop.propertyName || prop.name || '').toLowerCase();
            if (name.includes('pack') || name.includes('includ') || name.includes('content') || name.includes('box')) {
              // Handle nested propertyValueList array
              const valueList = prop.propertyValueList || prop.values || [];
              if (Array.isArray(valueList) && valueList.length > 0) {
                const values: string[] = [];
                for (const v of valueList) {
                  const val = String(v.propertyValueNameEn || v.propertyValueName || v.value || '').trim();
                  if (val && !/[\u4e00-\u9fff]/.test(val)) values.push(val);
                }
                if (values.length > 0) {
                  rawPackingList = values.join(', ');
                  break;
                }
              } else {
                // Scalar value fallback
                rawPackingList = String(prop.propertyValueNameEn || prop.propertyValueName || prop.value || '').trim();
                if (rawPackingList) break;
              }
            }
          }
        }
      }
      
      const packingList = sanitizeHtml(rawPackingList) || (rawPackingList && rawPackingList.length > 2 && !/[\u4e00-\u9fff]/.test(rawPackingList) ? rawPackingList : undefined);
      
      // Extract Overview - short product summary from name/category
      // ALWAYS build overview with whatever data we have - this ensures Page 3 shows something
      let overview: string | undefined;
      const categoryDisplay = source.threeCategoryName || source.twoCategoryName || source.oneCategoryName || categoryName || '';
      const overviewParts: string[] = [];
      
      // Category - always include if available
      if (categoryDisplay && !categoryDisplay.includes('_')) {
        overviewParts.push(`Category: ${categoryDisplay}`);
      }
      
      // Material - include if available and not Chinese-only
      if (material && material.length > 1 && !/[\u4e00-\u9fff]/.test(material)) {
        overviewParts.push(`Material: ${material}`);
      }
      
      // Packing/Package info
      if (packingInfo && packingInfo.length > 1 && !/[\u4e00-\u9fff]/.test(packingInfo)) {
        overviewParts.push(`Package: ${packingInfo}`);
      }
      
      // Weight
      if (productWeight && productWeight > 0) {
        overviewParts.push(`Weight: ${productWeight}g`);
      }
      
      // Dimensions
      if (packLength && packWidth && packHeight) {
        overviewParts.push(`Dimensions: ${packLength} × ${packWidth} × ${packHeight} cm`);
      }
      
      // Delivery cycle
      if (source.deliveryCycle) {
        overviewParts.push(`Delivery: ${source.deliveryCycle} days`);
      }
      
      // HS Code for customs info
      if (source.entryCode && source.entryNameEn) {
        overviewParts.push(`HS Code: ${source.entryCode}`);
      }
      
      // Product type
      if (productType && productType.length > 1 && productType !== 'ORDINARY_PRODUCT') {
        overviewParts.push(`Type: ${productType}`);
      }
      
      if (overviewParts.length > 0) {
        overview = overviewParts.join('<br/>');
      }
      
      // If Overview only has Category (meaning we didn't find material/weight/etc from raw fields),
      // try to use synthesizedInfo which was built in fetchProductDetailsByPid with this data
      if (overviewParts.length <= 1 && source.synthesizedInfo) {
        // synthesizedInfo contains Material, Package, Weight, Dimensions, Category, Delivery, HS Code
        // Split on <br/> BEFORE sanitizing to preserve line structure, then sanitize each line
        const synthLines = String(source.synthesizedInfo).split(/<br\s*\/?>/i);
        const cleanedLines: string[] = [];
        for (const line of synthLines) {
          const cleaned = sanitizeHtml(line);
          if (cleaned && cleaned.length > 2) {
            cleanedLines.push(cleaned);
          }
        }
        if (cleanedLines.length > 1) {
          overview = cleanedLines.join('<br/>');
          console.log(`[Search&Price] Product ${pid}: Using synthesizedInfo as Overview (${cleanedLines.length} lines)`);
        }
      }
      
      // Extract Size Info - dimensions, size options from properties and variants
      let sizeInfo: string | undefined;
      const sizeLines: string[] = [];
      
      // Add pack dimensions if available
      if (packLength && packWidth && packHeight) {
        sizeLines.push(`Package Size: ${packLength} × ${packWidth} × ${packHeight} cm`);
      }
      
      // Extract size properties from propertyList
      const sizePropList = source.productPropertyList || source.propertyList || [];
      if (Array.isArray(sizePropList)) {
        for (const prop of sizePropList) {
          const propName = String(prop.propertyNameEn || prop.propertyName || prop.name || '').toLowerCase();
          if (propName.includes('size') || propName.includes('dimension') || propName.includes('length') || 
              propName.includes('width') || propName.includes('height') || propName.includes('bust') || 
              propName.includes('waist') || propName.includes('hip')) {
            const valueList = prop.propertyValueList || prop.values || [];
            if (Array.isArray(valueList) && valueList.length > 0) {
              const values: string[] = [];
              for (const v of valueList) {
                const val = String(v.propertyValueNameEn || v.propertyValueName || v.value || '').trim();
                if (val && !/^[\u4e00-\u9fff]+$/.test(val)) values.push(val);
              }
              if (values.length > 0) {
                const displayName = prop.propertyNameEn || prop.propertyName || 'Size';
                sizeLines.push(`${displayName}: ${values.join(', ')}`);
              }
            }
          }
        }
      }
      
      if (sizeLines.length > 0) {
        sizeInfo = sizeLines.join('<br/>');
      }
      
      // Extract Size Chart Images (CJ provides these as separate images)
      const sizeChartImages: string[] = [];
      const sizeChartFields = ['sizeChartImage', 'sizeChart', 'sizeImage', 'measurementImage', 'chartImage'];
      for (const field of sizeChartFields) {
        const val = source[field];
        if (typeof val === 'string' && val.startsWith('http')) {
          sizeChartImages.push(val);
        } else if (Array.isArray(val)) {
          for (const img of val) {
            if (typeof img === 'string' && img.startsWith('http')) {
              sizeChartImages.push(img);
            }
          }
        }
      }
      // Also check detailImageList for size chart images (often contain measurement diagrams)
      const detailImages = source.detailImageList || source.descriptionImages || [];
      if (Array.isArray(detailImages)) {
        for (const img of detailImages) {
          const url = typeof img === 'string' ? img : (img?.url || img?.imageUrl || '');
          if (typeof url === 'string' && url.startsWith('http') && /size|chart|measure|dimension/i.test(url)) {
            sizeChartImages.push(url);
          }
        }
      }
      
      // Log what we found for debugging - all 6 Page 3 fields
      console.log(`[Search&Price] Product ${pid} Page 3 fields:`);
      console.log(`  - description: ${description ? `YES (${description.length} chars)` : 'NO'}`);
      console.log(`  - overview: ${overview ? `YES (${overview.length} chars)` : 'NO'}`);
      console.log(`  - productInfo: ${productInfo ? `YES (${productInfo.length} chars)` : 'NO'}`);
      console.log(`  - sizeInfo: ${sizeInfo ? `YES (${sizeInfo.length} chars)` : 'NO'}`);
      console.log(`  - productNote: ${productNote ? `YES (${productNote.length} chars)` : 'NO'}`);
      console.log(`  - packingList: ${packingList ? `YES (${packingList.length} chars)` : 'NO'}`);
      console.log(`  - sizeChartImages: ${sizeChartImages.length}`);
      
      // Fetch variants - CJ returns only purchasable variants in this API
      const variants = await getVariantsForProduct(token, base, pid);
      
      // Build set of images from variants (these are the purchasable color options)
      const variantImages: string[] = [];
      const seenUrls = new Set<string>();
      
      // First, add the main product image (this is always the hero image)
      const mainImage = item.productImage || item.image || item.bigImage;
      if (typeof mainImage === 'string' && mainImage.startsWith('http')) {
        seenUrls.add(mainImage);
        variantImages.push(mainImage);
      }
      
      // Extract images from ALL variants (CJ only returns purchasable ones)
      // Check all possible image field names
      const imgFields = ['variantImage', 'whiteImage', 'image', 'imageUrl', 'imgUrl', 'bigImage', 'variantImg', 'skuImage', 'pic', 'picture', 'photo'];
      
      for (const v of variants) {
        for (const field of imgFields) {
          const url = v[field];
          if (typeof url === 'string' && url.startsWith('http') && !seenUrls.has(url)) {
            seenUrls.add(url);
            variantImages.push(url);
          }
        }
        
        // Also check nested structures like variantProperty
        const variantProps = v.variantPropertyList || v.propertyList || v.properties || [];
        if (Array.isArray(variantProps)) {
          for (const prop of variantProps) {
            const propImg = prop?.image || prop?.propImage || prop?.imageUrl || prop?.pic;
            if (typeof propImg === 'string' && propImg.startsWith('http') && !seenUrls.has(propImg)) {
              seenUrls.add(propImg);
              variantImages.push(propImg);
            }
          }
        }
      }
      
      console.log(`[Search&Price] Product ${pid}: ${variantImages.length} images from ${variants.length} variants`);
      
      // Build combined product info: start with productInfo, then add variant colors/sizes
      // This ensures we show BOTH material/packing specs AND variant options
      const allSpecs: string[] = [];
      
      // Initialize extracted sizes/colors for filtering
      let extractedSizes: string[] = [];
      let extractedColors: string[] = [];
      
      // First, add base product specs (material, packing, weight, etc.)
      let baseSpecs = productInfo;
      if (!baseSpecs && source.synthesizedInfo) {
        // Split on <br/> BEFORE sanitizing to preserve line structure
        const synthLines = String(source.synthesizedInfo).split(/<br\s*\/?>/i);
        const cleanedLines: string[] = [];
        for (const line of synthLines) {
          const cleaned = sanitizeHtml(line);
          if (cleaned && cleaned.length > 2) {
            cleanedLines.push(cleaned);
          }
        }
        if (cleanedLines.length > 0) {
          baseSpecs = cleanedLines.join('<br/>');
          console.log(`[Search&Price] Product ${pid}: Using synthesizedInfo for base specs (${cleanedLines.length} lines)`);
        }
      }
      if (!baseSpecs) {
        const basicSpecs = buildBasicSpecs();
        if (basicSpecs && basicSpecs.length > 10) {
          baseSpecs = basicSpecs;
          console.log(`[Search&Price] Product ${pid}: Using buildBasicSpecs for base specs`);
        }
      }
      
      // Add base specs to allSpecs
      if (baseSpecs) {
        allSpecs.push(baseSpecs);
      }
      
      // Now extract variant colors/sizes/models and ADD them (not replace)
      let extractedModels: string[] = [];
      
      if (variants.length > 0) {
        // Debug: Log first variant structure to understand CJ format
        const sampleVariant = variants[0];
        console.log(`[Search&Price] Product ${pid}: Sample variant keys: ${Object.keys(sampleVariant).join(', ')}`);
        console.log(`[Search&Price] Product ${pid}: Sample variant data: ${JSON.stringify(sampleVariant).substring(0, 500)}`);
        
        const colors = new Set<string>();
        const sizes = new Set<string>();
        const models = new Set<string>();
        
        // Extended color list for matching
        const colorList = ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Purple', 'Orange', 'Brown', 'Grey', 'Gray', 'Beige', 'Navy', 'Khaki', 'Apricot', 'Wine', 'Coffee', 'Camel', 'Cream', 'Rose', 'Gold', 'Silver', 'Ivory', 'Mint', 'Coral', 'Burgundy', 'Maroon', 'Olive', 'Teal', 'Turquoise', 'Lavender', 'Lilac', 'Peach', 'Tan', 'Charcoal', 'Violet', 'Nude', 'Dark Grey', 'Light Grey', 'Dark Blue', 'Light Blue', 'Sky Blue', 'Dark Green', 'Light Green', 'Dark Pink', 'Light Pink', 'Off White'];
        const colorSet = new Set(colorList.map(c => c.toLowerCase()));
        const colorPattern = /\b(Black|White|Red|Blue|Green|Yellow|Pink|Purple|Orange|Brown|Grey|Gray|Beige|Navy|Khaki|Apricot|Wine|Coffee|Camel|Cream|Rose|Gold|Silver|Ivory|Mint|Coral|Burgundy|Maroon|Olive|Teal|Turquoise|Lavender|Lilac|Peach|Tan|Charcoal|Sky Blue|Dark Blue|Light Blue|Light Green|Dark Green|Light Pink|Dark Pink|Off White|Nude|Violet|Dark Grey|Light Grey)\b/gi;
        
        // Device model patterns (phones, tablets, etc.)
        const deviceModelPattern = /\b(iPhone\s*\d+\s*(?:Pro|Plus|Max|mini|SE)?(?:\s*Max)?|Samsung\s*(?:S|A|Note|Galaxy)\s*\d+(?:\s*(?:Plus|Ultra|FE))?|Xiaomi|Huawei|Redmi|OPPO|Vivo|OnePlus|Pixel|iPad|Galaxy\s*Tab)/i;
        
        // Standard clothing/shoe size pattern
        const clothingSizePattern = /^(XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|5XL|6XL|One Size|Free Size)$/i;
        const shoeSizePattern = /^(EU\s*\d+|US\s*\d+|\d{2,3}(?:cm)?)$/i;
        
        // Helper function to check if a string is a known color (use non-global regex to avoid lastIndex issues)
        const isColor = (s: string): boolean => {
          const lower = s.toLowerCase().trim();
          if (colorSet.has(lower)) return true;
          // Use non-global regex for test() to avoid lastIndex state issues
          const colorTestPattern = /\b(Black|White|Red|Blue|Green|Yellow|Pink|Purple|Orange|Brown|Grey|Gray|Beige|Navy|Khaki|Apricot|Wine|Coffee|Camel|Cream|Rose|Gold|Silver|Ivory|Mint|Coral|Burgundy|Maroon|Olive|Teal|Turquoise|Lavender|Lilac|Peach|Tan|Charcoal|Sky Blue|Dark Blue|Light Blue|Light Green|Dark Green|Light Pink|Dark Pink|Off White|Nude|Violet|Dark Grey|Light Grey)\b/i;
          return colorTestPattern.test(s);
        };
        
        // Helper function to check if a string is a device model (use non-global regex)
        const isDeviceModel = (s: string): boolean => {
          const deviceTestPattern = /\b(iPhone\s*\d+\s*(?:Pro|Plus|Max|mini|SE)?(?:\s*Max)?|Samsung\s*(?:S|A|Note|Galaxy)\s*\d+(?:\s*(?:Plus|Ultra|FE))?|Xiaomi|Huawei|Redmi|OPPO|Vivo|OnePlus|Pixel|iPad|Galaxy\s*Tab)/i;
          return deviceTestPattern.test(s);
        };
        
        // Helper function to check if a string is a clothing/shoe size
        const isClothingSize = (s: string): boolean => {
          return clothingSizePattern.test(s.trim()) || shoeSizePattern.test(s.trim());
        };
        
        // Helper to parse a combined value like "Violet-iPhone 11Pro Max"
        const parseVariantValue = (value: string) => {
          if (!value) return;
          
          // Clean Chinese characters
          let cleanVal = value.replace(/[\u4e00-\u9fff]/g, '').trim();
          if (!cleanVal || cleanVal.length > 60) return;
          
          // Try to split on common delimiters
          const delimiters = ['-', '/', '|', '_'];
          let parts: string[] = [cleanVal];
          
          for (const delim of delimiters) {
            if (cleanVal.includes(delim)) {
              // Split and check if first part looks like a color
              const splitParts = cleanVal.split(delim).map(p => p.trim()).filter(Boolean);
              if (splitParts.length >= 2 && isColor(splitParts[0])) {
                parts = splitParts;
                break;
              }
            }
          }
          
          if (parts.length >= 2 && isColor(parts[0])) {
            // First part is color, rest is model/size
            colors.add(parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase());
            const remainder = parts.slice(1).join(' ').trim();
            if (remainder) {
              if (isDeviceModel(remainder)) {
                models.add(remainder);
              } else if (isClothingSize(remainder)) {
                sizes.add(remainder.toUpperCase());
              } else {
                // Could be a model or size - check further
                if (/iPhone|Samsung|Xiaomi|Huawei|Redmi|OPPO|Vivo|OnePlus|Pixel|iPad|Galaxy/i.test(remainder)) {
                  models.add(remainder);
                } else {
                  sizes.add(remainder);
                }
              }
            }
          } else if (parts.length === 1) {
            // Single value - classify it
            const val = parts[0];
            if (isColor(val)) {
              colors.add(val.charAt(0).toUpperCase() + val.slice(1).toLowerCase());
            } else if (isDeviceModel(val)) {
              models.add(val);
            } else if (isClothingSize(val)) {
              sizes.add(val.toUpperCase());
            } else {
              // Unknown - check if it looks like a device
              if (/iPhone|Samsung|Xiaomi|Huawei|Redmi|OPPO|Vivo|OnePlus|Pixel|iPad|Galaxy/i.test(val)) {
                models.add(val);
              } else {
                sizes.add(val);
              }
            }
          }
        };
        
        for (const v of variants) {
          // 1. First try explicit fields (most reliable)
          const explicitSize = v.size || v.sizeNameEn || v.sizeName;
          const explicitColor = v.color || v.colour || v.colorNameEn || v.colorName;
          const explicitModel = v.model || v.modelNameEn || v.modelName;
          
          if (explicitColor) {
            const cleanColor = String(explicitColor).replace(/[\u4e00-\u9fff]/g, '').trim();
            if (cleanColor && cleanColor.length > 0 && cleanColor.length < 50 && /[a-zA-Z]/.test(cleanColor)) {
              colors.add(cleanColor);
            }
          }
          
          if (explicitSize) {
            const cleanSize = String(explicitSize).replace(/[\u4e00-\u9fff]/g, '').trim();
            if (cleanSize && cleanSize.length > 0 && cleanSize.length < 50) {
              if (isDeviceModel(cleanSize)) {
                models.add(cleanSize);
              } else {
                sizes.add(cleanSize);
              }
            }
          }
          
          if (explicitModel) {
            const cleanModel = String(explicitModel).replace(/[\u4e00-\u9fff]/g, '').trim();
            if (cleanModel && cleanModel.length > 0 && cleanModel.length < 50) {
              models.add(cleanModel);
            }
          }
          
          // 2. Check variant properties (structured data)
          const vProps = v.variantPropertyList || v.propertyList || v.properties || [];
          if (Array.isArray(vProps)) {
            for (const p of vProps) {
              const propName = String(p.propertyNameEn || p.propertyName || p.name || '').toLowerCase();
              const propValue = String(p.propertyValueNameEn || p.propertyValueName || p.value || p.name || '').trim();
              if (propValue && propValue.length > 0 && propValue.length < 50) {
                const cleanValue = propValue.replace(/[\u4e00-\u9fff]/g, '').trim();
                if (!cleanValue) continue;
                
                if (propName.includes('color') || propName.includes('colour')) {
                  if (/[a-zA-Z]/.test(cleanValue)) {
                    colors.add(cleanValue);
                  }
                } else if (propName.includes('model') || propName.includes('device') || propName.includes('phone')) {
                  models.add(cleanValue);
                } else if (propName.includes('size') || propName.includes('type') || propName.includes('version')) {
                  if (isDeviceModel(cleanValue)) {
                    models.add(cleanValue);
                  } else {
                    sizes.add(cleanValue);
                  }
                }
              }
            }
          }
          
          // 3. Parse variantKey (may contain combined color-model like "Violet-iPhone 11Pro")
          if (v.variantKey) {
            parseVariantValue(String(v.variantKey));
          }
          
          // 4. Parse variantNameEn as fallback
          if (v.variantNameEn) {
            parseVariantValue(String(v.variantNameEn));
          }
        }
        
        // Sanitize values - strip any HTML/script tags
        const stripHtml = (s: string) => s.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim();
        const safeColors = [...colors].map(stripHtml).filter(c => c.length > 0 && c.length < 50);
        const safeSizes = [...sizes].map(stripHtml).filter(s => s.length > 0 && s.length < 50);
        const safeModels = [...models].map(stripHtml).filter(m => m.length > 0 && m.length < 50);
        
        // Only add to specs if not already present (avoid duplicates)
        const baseSpecsLower = (baseSpecs || '').toLowerCase();
        if (safeColors.length > 0 && !baseSpecsLower.includes('colors:')) {
          allSpecs.push(`Colors: ${safeColors.slice(0, 15).join(', ')}`);
        }
        if (safeModels.length > 0) {
          allSpecs.push(`Compatible Devices: ${safeModels.slice(0, 25).join(', ')}`);
        }
        if (safeSizes.length > 0 && !baseSpecsLower.includes('sizes:')) {
          allSpecs.push(`Sizes: ${safeSizes.slice(0, 15).join(', ')}`);
        }
        
        console.log(`[Search&Price] Product ${pid}: ${safeColors.length} colors, ${safeSizes.length} sizes, ${safeModels.length} models from ${variants.length} variants`);
        
        // Store for later use
        extractedSizes = safeSizes;
        extractedColors = safeColors;
        extractedModels = safeModels;
      }
      
      // Combine all specs into finalProductInfo
      // Note: productInfo should contain variant specs (colors, sizes) while Overview has basic product specs
      // This prevents duplication between the two sections
      let finalProductInfo: string | undefined = allSpecs.length > 0 ? allSpecs.join('<br/>') : undefined;
      
      // Don't add duplicate fallback here - Overview already shows Category, Material, Weight etc.
      // productInfo is specifically for variant/specification details not shown in Overview
      
      // Use variant images if we have them, otherwise keep original images
      if (variantImages.length > 1) {
        images = variantImages.slice(0, 50);
      } else if (variantImages.length === 1) {
        // Only main image found from variants - combine with original images but limit
        const combinedImages = [...variantImages];
        for (const img of images) {
          if (!seenUrls.has(img)) {
            seenUrls.add(img);
            combinedImages.push(img);
          }
        }
        images = combinedImages.slice(0, 50);
      }
      // else keep original images as fallback
      
      const pricedVariants: PricedVariant[] = [];
      
      
      if (variants.length === 0) {
        // Single variant product - try to get exact shipping using product-level vid
        const sellPrice = Number(item.sellPrice || item.price || 0);
        const costSAR = usdToSar(sellPrice);
        
        // For single-variant products, use pid or product-level vid
        const variantVid = String(item.vid || item.variants?.[0]?.vid || pid || '');
        
        let shippingPriceUSD = 0;
        let shippingPriceSAR = 0;
        let shippingAvailable = false;
        let deliveryDays = 'Unknown';
        let logisticName: string | undefined;
        let shippingError: string | undefined;
        
        if (variantVid) {
          // Add delay to respect rate limit (1 req/sec) - use 1200ms for safety margin
          await new Promise(resolve => setTimeout(resolve, 1200));
          
          try {
            const freight = await freightCalculate({
              countryCode: 'US',
              vid: variantVid,
              quantity: 1,
            });
            
            if (!freight.ok) {
              shippingError = freight.message;
              // Check for rate limit error (code 1600200)
              if (freight.message.includes('1600200') || freight.message.includes('Too Many Requests')) {
                consecutiveRateLimitErrors++;
                console.log(`[Search&Price] Rate limit error #${consecutiveRateLimitErrors}: ${freight.message}`);
              }
            } else if (freight.options.length > 0) {
              consecutiveRateLimitErrors = 0; // Reset on success
              const cjPacketOrdinary = findCJPacketOrdinary(freight.options);
              if (cjPacketOrdinary) {
                shippingPriceUSD = cjPacketOrdinary.price;
                shippingPriceSAR = usdToSar(shippingPriceUSD);
                shippingAvailable = true;
                logisticName = cjPacketOrdinary.name;
                if (cjPacketOrdinary.logisticAgingDays) {
                  const { min, max } = cjPacketOrdinary.logisticAgingDays;
                  deliveryDays = max ? `${min}-${max} days` : `${min} days`;
                }
              } else {
                shippingError = 'CJPacket Ordinary not available';
              }
            } else {
              shippingError = 'No shipping options to USA';
            }
          } catch (e: any) {
            shippingError = e?.message || 'Shipping failed';
            if (shippingError && (shippingError.includes('429') || shippingError.includes('Too Many'))) {
              consecutiveRateLimitErrors++;
            }
          }
        } else {
          shippingError = 'No variant ID available';
        }
        
        // ALWAYS include products - use fallback estimated shipping if API failed
        // User confirmed ALL CJ products support CJPacket Ordinary
        if (!shippingAvailable) {
          // Fallback: estimate shipping based on product price bracket
          // Typical CJPacket Ordinary rates: $5-15 depending on weight/size
          const estimatedShippingUSD = sellPrice > 20 ? 8.99 : sellPrice > 10 ? 6.99 : 4.99;
          shippingPriceUSD = estimatedShippingUSD;
          shippingPriceSAR = usdToSar(shippingPriceUSD);
          shippingAvailable = true; // Mark as available with estimate
          logisticName = 'CJPacket Ordinary (Estimated)';
          deliveryDays = '7-12 days';
          console.log(`[Search&Price] Product ${pid}: Using estimated shipping $${estimatedShippingUSD} (API failed: ${shippingError})`);
        }
        
        const totalCostSAR = costSAR + shippingPriceSAR;
        const sellPriceSAR = calculateSellPriceWithMargin(totalCostSAR, profitMargin);
        const profitSAR = sellPriceSAR - totalCostSAR;
        
        // Get variant stock from the inventory map using multiple key fallbacks
        // Single-variant product: try productSku, pid, or first available stock entry (aggregate if multiple rows)
        let variantStock = getVariantStock({
          vid: pid,
          sku: item.productSku,
        });
        if (!variantStock && variantStockMap.size > 0) {
          // For single-variant products with multiple inventory rows (e.g., different warehouses),
          // aggregate all entries to get the total stock
          const allStocks = Array.from(variantStockMap.values());
          variantStock = {
            cjStock: allStocks.reduce((sum, s) => sum + s.cjStock, 0),
            factoryStock: allStocks.reduce((sum, s) => sum + s.factoryStock, 0),
            totalStock: allStocks.reduce((sum, s) => sum + s.totalStock, 0),
          };
        }
        // FALLBACK: For single-variant products, use product-level inventory if per-variant lookup failed
        // This ensures we don't show 0/0 when product-level data is available
        if (!variantStock && realInventory) {
          console.log(`[Search&Price] Product ${pid}: Using product-level inventory for single variant`);
          variantStock = {
            cjStock: realInventory.totalCJ,
            factoryStock: realInventory.totalFactory,
            totalStock: realInventory.totalAvailable,
          };
        }
        
        pricedVariants.push({
          variantId: pid,
          variantSku: item.productSku || pid,
          variantPriceUSD: sellPrice,
          shippingAvailable,
          shippingPriceUSD,
          shippingPriceSAR,
          deliveryDays,
          logisticName,
          sellPriceSAR,
          totalCostSAR,
          profitSAR,
          error: shippingError,
          stock: variantStock?.totalStock,
          cjStock: variantStock?.cjStock,
          factoryStock: variantStock?.factoryStock,
        });
        
        // Stop processing if we hit 3+ consecutive rate limit errors (likely real quota issue)
        if (consecutiveRateLimitErrors >= 3) {
          console.log(`[Search&Price] Stopping after ${consecutiveRateLimitErrors} consecutive rate limit errors`);
          break;
        }
      } else {
        // Multi-variant product - check heaviest variants first to find HIGHEST shipping cost
        // This ensures we match CJ's "According to Shipping Method" which uses the heaviest variant
        const MAX_VARIANTS_TO_CHECK = 2; // Only check 2 variants (heaviest first) to stay within timeout
        
        // Sort variants by weight (descending) to check heaviest first
        // CJ shipping cost is primarily driven by weight, so heaviest = highest shipping
        const sortedVariants = [...variants].sort((a, b) => {
          const weightA = Number(a.packWeight || a.variantWeight || a.weight || 0);
          const weightB = Number(b.packWeight || b.variantWeight || b.weight || 0);
          return weightB - weightA; // Descending (heaviest first)
        });
        
        // Collect all valid shipping quotes, then pick the highest
        const variantShippingQuotes: Array<{
          variantIndex: number;
          variant: any;
          shippingPriceUSD: number;
          shippingPriceSAR: number;
          deliveryDays: string;
          logisticName: string;
        }> = [];
        
        for (let i = 0; i < Math.min(sortedVariants.length, MAX_VARIANTS_TO_CHECK); i++) {
          // Stop checking if we hit rate limit or time budget exceeded
          if (consecutiveRateLimitErrors >= 3) break;
          if (Date.now() - startTime > 50000) {
            console.log(`[Search&Price] Time budget exceeded (50s), stopping variant checks`);
            break;
          }
          
          const variant = sortedVariants[i];
          const variantId = String(variant.vid || variant.variantId || variant.id || '');
          const variantSku = String(variant.variantSku || variant.sku || variantId);
          const variantPriceUSD = Number(variant.variantSellPrice || variant.sellPrice || variant.price || 0);
          const costSAR = usdToSar(variantPriceUSD);
          
          const variantName = String(variant.variantNameEn || variant.variantName || '').replace(/[\u4e00-\u9fff]/g, '').trim() || undefined;
          const variantImage = variant.variantImage || variant.whiteImage || variant.image || undefined;
          const size = variant.size || variant.sizeNameEn || undefined;
          const color = variant.color || variant.colorNameEn || undefined;
          
          let shippingPriceUSD = 0;
          let shippingPriceSAR = 0;
          let shippingAvailable = false;
          let deliveryDays = 'Unknown';
          let logisticName: string | undefined;
          let shippingError: string | undefined;
          
          if (variantId) {
            // Add delay to respect rate limit (1 req/sec) - use 1200ms for safety margin
            await new Promise(resolve => setTimeout(resolve, 1200));
            
            try {
              const freight = await freightCalculate({
                countryCode: 'US',
                vid: variantId,
                quantity: 1,
              });
              
              if (!freight.ok) {
                shippingError = freight.message;
                shippingErrors[shippingError] = (shippingErrors[shippingError] || 0) + 1;
                // Check for rate limit error
                if (freight.message.includes('1600200') || freight.message.includes('Too Many Requests')) {
                  consecutiveRateLimitErrors++;
                  console.log(`[Search&Price] Rate limit error #${consecutiveRateLimitErrors}: ${freight.message}`);
                }
              } else if (freight.options.length > 0) {
                consecutiveRateLimitErrors = 0; // Reset on success
                const cjPacketOrdinary = findCJPacketOrdinary(freight.options);
                if (cjPacketOrdinary) {
                  shippingPriceUSD = cjPacketOrdinary.price;
                  shippingPriceSAR = usdToSar(shippingPriceUSD);
                  shippingAvailable = true;
                  logisticName = cjPacketOrdinary.name;
                  if (cjPacketOrdinary.logisticAgingDays) {
                    const { min, max } = cjPacketOrdinary.logisticAgingDays;
                    deliveryDays = max ? `${min}-${max} days` : `${min} days`;
                  }
                } else {
                  shippingError = 'CJPacket Ordinary not available';
                  shippingErrors[shippingError] = (shippingErrors[shippingError] || 0) + 1;
                }
              } else {
                shippingError = 'No shipping options to USA';
                shippingErrors[shippingError] = (shippingErrors[shippingError] || 0) + 1;
              }
            } catch (e: any) {
              shippingError = e?.message || 'Shipping failed';
              if (shippingError) {
                shippingErrors[shippingError] = (shippingErrors[shippingError] || 0) + 1;
                if (shippingError.includes('429') || shippingError.includes('Too Many')) {
                  consecutiveRateLimitErrors++;
                }
              }
            }
          }
          
          // Stop checking variants if we hit too many consecutive rate limit errors
          if (consecutiveRateLimitErrors >= 3) {
            console.log(`[Search&Price] Stopping variant check after ${consecutiveRateLimitErrors} consecutive rate limit errors`);
            break;
          }
          
          if (shippingAvailable && logisticName) {
            // Collect this quote - we'll pick the highest later
            variantShippingQuotes.push({
              variantIndex: i,
              variant,
              shippingPriceUSD,
              shippingPriceSAR,
              deliveryDays,
              logisticName,
            });
            console.log(`[Search&Price] Product ${pid} variant ${i+1}: CJPacket Ordinary $${shippingPriceUSD.toFixed(2)}`);
          } else {
            console.log(`[Search&Price] Product ${pid} variant ${i+1}: ${shippingError}`);
          }
        }
        
        // Now pick the variant with the HIGHEST shipping cost (matches CJ's heaviest variant logic)
        // If no shipping quotes found, use first variant with estimated shipping (ALL CJ products support CJPacket)
        let useEstimatedShipping = false;
        let selectedVariant: any;
        let selectedShipping = { shippingPriceUSD: 0, shippingPriceSAR: 0, deliveryDays: 'Unknown', logisticName: '' };
        
        if (variantShippingQuotes.length > 0) {
          // Sort by shipping price descending and take the highest
          variantShippingQuotes.sort((a, b) => b.shippingPriceUSD - a.shippingPriceUSD);
          const highest = variantShippingQuotes[0];
          selectedVariant = highest.variant;
          selectedShipping = {
            shippingPriceUSD: highest.shippingPriceUSD,
            shippingPriceSAR: highest.shippingPriceSAR,
            deliveryDays: highest.deliveryDays,
            logisticName: highest.logisticName,
          };
        } else if (sortedVariants.length > 0) {
          // FALLBACK: No shipping quotes found, use estimated shipping for first variant
          // User confirmed ALL CJ products support CJPacket Ordinary
          useEstimatedShipping = true;
          selectedVariant = sortedVariants[0];
          const variantPrice = Number(selectedVariant.variantSellPrice || selectedVariant.sellPrice || selectedVariant.price || 0);
          const estimatedShippingUSD = variantPrice > 20 ? 8.99 : variantPrice > 10 ? 6.99 : 4.99;
          selectedShipping = {
            shippingPriceUSD: estimatedShippingUSD,
            shippingPriceSAR: usdToSar(estimatedShippingUSD),
            deliveryDays: '7-12 days',
            logisticName: 'CJPacket Ordinary (Estimated)',
          };
          console.log(`[Search&Price] Product ${pid}: Using estimated shipping $${estimatedShippingUSD} (no API quotes found)`);
        }
        
        if (selectedVariant) {
          const variant = selectedVariant;
          
          console.log(`[Search&Price] Product ${pid}: Using shipping $${selectedShipping.shippingPriceUSD.toFixed(2)} (${useEstimatedShipping ? 'estimated' : 'from API'})`);
          
          const variantId = String(variant.vid || variant.variantId || variant.id || '');
          const variantSku = String(variant.variantSku || variant.sku || variantId);
          const variantPriceUSD = Number(variant.variantSellPrice || variant.sellPrice || variant.price || 0);
          const costSAR = usdToSar(variantPriceUSD);
          const variantName = String(variant.variantNameEn || variant.variantName || '').replace(/[\u4e00-\u9fff]/g, '').trim() || undefined;
          const variantImage = variant.variantImage || variant.whiteImage || variant.image || undefined;
          
          // Extract color and size - first try explicit fields, then parse from variantKey
          let size = variant.size || variant.sizeNameEn || undefined;
          let color = variant.color || variant.colorNameEn || undefined;
          const variantKeyRaw = String(variant.variantKey || variant.variantNameEn || variantName || '');
          
          // If color/size not explicitly provided, parse from variantKey (format: "Color-Size" or "Model-Size")
          if ((!color || !size) && variantKeyRaw.includes('-')) {
            const parts = variantKeyRaw.split('-');
            if (parts.length >= 2) {
              // Last part is usually size (L, XL, XXL, M, S, etc.)
              const lastPart = parts[parts.length - 1].trim();
              const firstPart = parts.slice(0, -1).join('-').trim();
              
              // Check if last part looks like a size
              const sizePattern = /^(XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|5XL|6XL|One Size|Free Size|\d{2,3})$/i;
              if (sizePattern.test(lastPart)) {
                if (!size) size = lastPart;
                if (!color) color = firstPart;
              } else {
                // Fallback: use whole variantKey as display name
                if (!color) color = variantKeyRaw;
              }
            }
          }
          
          // If still no values, use variantKey as display name
          if (!color && !size && variantKeyRaw) {
            color = variantKeyRaw;
          }
          
          const totalCostSAR = costSAR + selectedShipping.shippingPriceSAR;
          const sellPriceSAR = calculateSellPriceWithMargin(totalCostSAR, profitMargin);
          const profitSAR = sellPriceSAR - totalCostSAR;
          
          // Get variant stock from the inventory map using multiple key fallbacks
          const variantKey = String(variant.variantKey || '');
          const variantStock = getVariantStock({
            vid: variantId,
            variantId: variantId,
            sku: variantSku,
            variantKey: variantKey,
            variantName: variantName,
          });
          
          pricedVariants.push({
            variantId,
            variantSku,
            variantPriceUSD,
            shippingAvailable: true,
            shippingPriceUSD: selectedShipping.shippingPriceUSD,
            shippingPriceSAR: selectedShipping.shippingPriceSAR,
            deliveryDays: selectedShipping.deliveryDays,
            logisticName: selectedShipping.logisticName,
            sellPriceSAR,
            totalCostSAR,
            profitSAR,
            variantName,
            variantImage,
            size,
            color,
            stock: variantStock?.totalStock,
            cjStock: variantStock?.cjStock,
            factoryStock: variantStock?.factoryStock,
          });
        }
      }
      
      // Stop processing more products if we hit too many consecutive rate limit errors
      if (consecutiveRateLimitErrors >= 3) {
        console.log(`[Search&Price] Stopping product processing after ${consecutiveRateLimitErrors} consecutive rate limit errors`);
        break;
      }
      
      // FALLBACK: If no variants were priced, create a fallback variant from product-level data
      // User confirmed ALL CJ products support CJPacket Ordinary, so we should never skip products
      if (pricedVariants.length === 0) {
        const sellPrice = Number(item.sellPrice || item.price || 0);
        const costSAR = usdToSar(sellPrice);
        const estimatedShippingUSD = sellPrice > 20 ? 8.99 : sellPrice > 10 ? 6.99 : 4.99;
        const shippingPriceSAR = usdToSar(estimatedShippingUSD);
        const totalCostSAR = costSAR + shippingPriceSAR;
        const sellPriceSAR = calculateSellPriceWithMargin(totalCostSAR, profitMargin);
        const profitSAR = sellPriceSAR - totalCostSAR;
        
        console.log(`[Search&Price] Product ${pid}: Creating fallback variant with estimated shipping $${estimatedShippingUSD}`);
        
        pricedVariants.push({
          variantId: pid,
          variantSku: item.productSku || pid,
          variantPriceUSD: sellPrice,
          shippingAvailable: true,
          shippingPriceUSD: estimatedShippingUSD,
          shippingPriceSAR,
          deliveryDays: '7-12 days',
          logisticName: 'CJPacket Ordinary (Estimated)',
          sellPriceSAR,
          totalCostSAR,
          profitSAR,
          stock: realInventory?.totalAvailable,
          cjStock: realInventory?.totalCJ,
          factoryStock: realInventory?.totalFactory,
        });
      }
      
      const successfulVariants = pricedVariants.filter(v => v.shippingAvailable).length;
      const prices = pricedVariants.map(v => v.sellPriceSAR);
      const minPriceSAR = Math.min(...prices);
      const maxPriceSAR = Math.max(...prices);
      const avgPriceSAR = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      
      // Extract processing/delivery time estimates from CJ data
      const deliveryCycle = source.deliveryCycle;
      const processDay = source.processDay || source.processingTime || source.processTime || source.prepareDay;
      
      // Helper to parse time values (can be "3", "2-7", "3-7 days", etc.)
      const parseTimeValue = (val: any): { display: string | undefined; hours: number | undefined } => {
        if (!val) return { display: undefined, hours: undefined };
        const strVal = String(val).trim();
        if (!strVal) return { display: undefined, hours: undefined };
        
        // Check if already has time units
        const hasUnits = /day|hour|week/i.test(strVal);
        const display = hasUnits ? strVal : `${strVal} days`;
        
        // Extract first number for hours calculation (if pure number or range start)
        const numMatch = strVal.match(/^(\d+)/);
        const hours = numMatch ? Number(numMatch[1]) * 24 : undefined;
        
        return { display, hours: (hours && !isNaN(hours)) ? hours : undefined };
      };
      
      const processingParsed = parseTimeValue(processDay);
      const deliveryParsed = parseTimeValue(deliveryCycle);
      
      const estimatedProcessingDays = processingParsed.display;
      const estimatedDeliveryDays = deliveryParsed.display;
      const processingTimeHours = processingParsed.hours;
      const deliveryTimeHours = deliveryParsed.hours;
      
      // Extract origin country and HS code
      const originCountry = String(source.originCountry || source.countryOrigin || source.originArea || '').trim() || undefined;
      const hsCode = source.entryCode ? `${source.entryCode}${source.entryNameEn ? ` (${source.entryNameEn})` : ''}` : undefined;
      
      // Extract video URL if available
      const videoUrl = String(source.videoUrl || source.video || source.productVideo || '').trim() || undefined;
      
      pricedProducts.push({
        pid,
        cjSku,
        name,
        images,
        minPriceSAR,
        maxPriceSAR,
        avgPriceSAR,
        stock,
        listedNum,
        // Inventory breakdown from CJ's dedicated inventory API (most accurate)
        totalVerifiedInventory: totalVerifiedInventory > 0 ? totalVerifiedInventory : undefined,
        totalUnVerifiedInventory: totalUnVerifiedInventory > 0 ? totalUnVerifiedInventory : undefined,
        // Full warehouse inventory object (for detailed display on Page 4)
        inventory: realInventory ? {
          totalCJ: realInventory.totalCJ,
          totalFactory: realInventory.totalFactory,
          totalAvailable: realInventory.totalAvailable,
          warehouses: realInventory.warehouses,
        } : undefined,
        // Inventory fetch status for UI feedback
        inventoryStatus,
        inventoryErrorMessage: inventoryErrorMessage || undefined,
        variants: pricedVariants,
        // ALL variant inventory data for Page 4 blue box display
        inventoryVariants: inventoryVariants.length > 0 ? inventoryVariants : undefined,
        successfulVariants,
        totalVariants: pricedVariants.length,
        description,
        overview,
        productInfo: finalProductInfo,
        sizeInfo,
        productNote,
        packingList,
        rating,
        reviewCount,
        categoryName,
        productWeight,
        packLength,
        packWidth,
        packHeight,
        material,
        productType,
        sizeChartImages: sizeChartImages.length > 0 ? sizeChartImages : undefined,
        processingTimeHours,
        deliveryTimeHours,
        estimatedProcessingDays,
        estimatedDeliveryDays,
        originCountry,
        hsCode,
        videoUrl,
        availableSizes: extractedSizes,
        availableColors: extractedColors,
        availableModels: extractedModels,
      });
    } // End of for (const item of batchItems)
    
    // Add delay between batches (not per-product) to respect CJ API rate limits
    // This is much more efficient than 1 second per product
    if (pricedProducts.length < quantity && candidateIndex < candidateProducts.length) {
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms between batches
    }
    } // End of while (pricedProducts.length < quantity)
    
    console.log(`[Search&Price] Batch processing complete: ${pricedProducts.length} valid products from ${productIndex} processed`);
    
    // Apply post-hydration filters (sizes)
    let filteredProducts = pricedProducts;
    let filteredBySizes = 0;
    
    // Filter by requested sizes
    if (requestedSizes.length > 0) {
      const beforeCount = filteredProducts.length;
      filteredProducts = filteredProducts.filter(p => {
        const productSizes = (p as any).availableSizes || [];
        // Products without sizes (e.g., electronics) pass through
        if (productSizes.length === 0) return true;
        // Check if any requested size matches product sizes
        const normalizedProductSizes = productSizes.map((s: string) => s.toUpperCase());
        return requestedSizes.some(rs => normalizedProductSizes.includes(rs));
      });
      filteredBySizes = beforeCount - filteredProducts.length;
      console.log(`[Search&Price] Filtered ${filteredBySizes} products not matching sizes: ${requestedSizes.join(',')}`);
    }
    
    // NOTE: Inventory is now fetched DURING product processing loop via getInventoryByPid
    // This ensures each product has inventory data before being pushed to pricedProducts
    
    const duration = Date.now() - startTime;
    console.log(`[Search&Price] Complete: ${filteredProducts.length} products returned (${pricedProducts.length} priced, ${filteredBySizes} filtered by size) in ${duration}ms`);
    console.log(`[Search&Price] Shipping error breakdown:`, shippingErrors);
    
    // Check if we hit rate limit issues during processing
    const hitRateLimit = consecutiveRateLimitErrors >= 3;
    if (hitRateLimit && filteredProducts.length === 0) {
      // No products with exact pricing due to rate limits - return error response
      console.log(`[Search&Price] Rate limit hit (${consecutiveRateLimitErrors} consecutive errors) and no products priced - returning error`);
      const r = NextResponse.json({
        ok: false,
        error: 'CJ API rate limit reached. Please wait a minute and try again with fewer products.',
        quotaExhausted: true,
        products: [],
        count: 0,
        duration,
        debug: {
          candidatesFound: candidateProducts.length,
          productsProcessed: productIndex,
          pricedSuccessfully: 0,
          shippingErrors,
          consecutiveRateLimitErrors,
        }
      }, { status: 429, headers: { 'Cache-Control': 'no-store' } });
      r.headers.set('x-request-id', log.requestId);
      return r;
    }
    
    // Calculate if we're short of the requested quantity and why
    const shortfall = quantity - filteredProducts.length;
    const cjPacketSuccessRate = productIndex > 0 ? Math.round((pricedProducts.length / productIndex) * 100) : 0;
    
    // Build explanation for why we may have fewer products than requested
    let shortfallReason = '';
    if (shortfall > 0) {
      const reasons = [];
      if (candidateProducts.length < quantity) {
        reasons.push(`Only ${candidateProducts.length} products exist in this category on CJ`);
      }
      if (hitRateLimit) {
        reasons.push('CJ API rate limit was reached during search');
      }
      if (Date.now() - startTime >= maxDurationMs - 1000) {
        reasons.push(`Search timed out after ${Math.round(maxDurationMs/1000)}s`);
      }
      shortfallReason = reasons.join('; ');
    }
    
    console.log(`[Search&Price] Final: ${filteredProducts.length}/${quantity} requested (${cjPacketSuccessRate}% CJPacket success rate)`);
    if (shortfallReason) {
      console.log(`[Search&Price] Shortfall reason: ${shortfallReason}`);
    }
    
    const r = NextResponse.json({
      ok: true,
      products: filteredProducts,
      count: filteredProducts.length,
      requestedQuantity: quantity,
      duration,
      quotaExhausted: hitRateLimit, // Flag if rate limit was hit during processing
      debug: {
        candidatesFound: candidateProducts.length,
        productsProcessed: productIndex,
        pricedSuccessfully: pricedProducts.length,
        filteredBySizes,
        shippingErrors,
        cjPacketSuccessRate,
        shortfallReason: shortfallReason || undefined,
      }
    }, { headers: { 'Cache-Control': 'no-store' } });
    r.headers.set('x-request-id', log.requestId);
    return r;
    
  } catch (e: any) {
    console.error('[Search&Price] Error:', e?.message, e?.stack);
    const r = NextResponse.json(
      { ok: false, error: e?.message || 'Search and price failed' }, 
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
    r.headers.set('x-request-id', loggerForRequest(req).requestId);
    return r;
  }
}
