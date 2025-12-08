import { NextResponse } from 'next/server';
import { getAccessToken, freightCalculate, fetchProductDetailsBatch } from '@/lib/cj/v2';
import { ensureAdmin } from '@/lib/auth/admin-guard';
import { fetchJson } from '@/lib/http';
import { loggerForRequest } from '@/lib/log';
import { usdToSar, computeRetailFromLanded } from '@/lib/pricing';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

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
  variants: PricedVariant[];
  successfulVariants: number;
  totalVariants: number;
};

async function fetchCjProductPage(
  token: string, 
  base: string, 
  categoryId: string | null,
  pageNum: number
): Promise<{ list: any[]; total: number }> {
  const params = new URLSearchParams();
  params.set('pageNum', String(pageNum));
  
  if (categoryId && categoryId !== 'all' && !categoryId.startsWith('first-') && !categoryId.startsWith('second-')) {
    params.set('categoryId', categoryId);
  }
  
  const url = `${base}/product/list?${params}`;
  console.log(`[Search&Price] Fetching: ${url}`);
  
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
    
    if (list.length > 0) {
      console.log(`[Search&Price] Sample product: pid=${list[0].pid}, name=${list[0].productNameEn?.slice(0, 50)}, price=${list[0].sellPrice}, listedNum=${list[0].listedNum}`);
    }
    
    return { list, total };
  } catch (e: any) {
    console.error(`[Search&Price] Fetch error:`, e?.message);
    return { list: [], total: 0 };
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
      console.log(`[Variants] Product ${pid}: ${variants.length} variants, image fields: [${imageKeys.join(', ')}]`);
      if (imageKeys.length > 0) {
        console.log(`[Variants] Sample image values:`, imageKeys.map(k => `${k}=${typeof sample[k] === 'string' ? sample[k].slice(0, 80) : typeof sample[k]}`).join(', '));
      }
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
    const categoryIds = categoryIdsParam.split(',').filter(Boolean);
    const quantity = Math.max(1, Math.min(1000, Number(searchParams.get('quantity') || 50)));
    const minPrice = Number(searchParams.get('minPrice') || 0);
    const maxPrice = Number(searchParams.get('maxPrice') || 1000);
    const minStock = Number(searchParams.get('minStock') || 0);
    const profitMargin = Math.max(1, Number(searchParams.get('profitMargin') || 8));
    const popularity = searchParams.get('popularity') || 'any';
    const freeShippingOnly = searchParams.get('freeShippingOnly') === '1';

    console.log(`[Search&Price] ========================================`);
    console.log(`[Search&Price] Starting search with params:`);
    console.log(`[Search&Price]   categories: ${categoryIds.join(',')}`);
    console.log(`[Search&Price]   quantity: ${quantity}`);
    console.log(`[Search&Price]   price range: $${minPrice} - $${maxPrice}`);
    console.log(`[Search&Price]   minStock: ${minStock}`);
    console.log(`[Search&Price]   popularity: ${popularity}`);
    console.log(`[Search&Price]   profitMargin: ${profitMargin}%`);
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
    const maxDurationMs = 90000;
    
    let totalFiltered = { price: 0, stock: 0, popularity: 0 };
    
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
        
        const pageResult = await fetchCjProductPage(token, base, catId, page);
        
        if (pageResult.list.length === 0) {
          console.log(`[Search&Price] No more products at page ${page}`);
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
          
          const stockRaw = item.stock ?? item.inventory;
          const hasStockInfo = stockRaw !== undefined && stockRaw !== null;
          const stock = hasStockInfo ? Number(stockRaw) : Infinity;
          if (hasStockInfo && stock < minStock) {
            totalFiltered.stock++;
            continue;
          }
          
          const listedNum = Number(item.listedNum || 0);
          if (popularity === 'high' && listedNum < 1000) {
            totalFiltered.popularity++;
            continue;
          }
          if (popularity === 'medium' && (listedNum < 100 || listedNum >= 1000)) {
            totalFiltered.popularity++;
            continue;
          }
          if (popularity === 'low' && listedNum >= 100) {
            totalFiltered.popularity++;
            continue;
          }
          
          candidateProducts.push(item);
        }
      }
    }
    
    console.log(`[Search&Price] ----------------------------------------`);
    console.log(`[Search&Price] Search complete:`);
    console.log(`[Search&Price]   Total candidates: ${candidateProducts.length}`);
    console.log(`[Search&Price]   Filtered by price: ${totalFiltered.price}`);
    console.log(`[Search&Price]   Filtered by stock: ${totalFiltered.stock}`);
    console.log(`[Search&Price]   Filtered by popularity: ${totalFiltered.popularity}`);
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
    
    const productsToPrice = candidateProducts.slice(0, Math.min(quantity, 20));
    console.log(`[Search&Price] Pricing ${productsToPrice.length} products...`);
    
    // Fetch full product details to get all images
    const pidsToHydrate = productsToPrice.map(p => String(p.pid || p.productId || '')).filter(Boolean);
    console.log(`[Search&Price] Hydrating ${pidsToHydrate.length} products with full details...`);
    const productDetailsMap = await fetchProductDetailsBatch(pidsToHydrate, 5);
    console.log(`[Search&Price] Successfully hydrated ${productDetailsMap.size} products`);
    
    const pricedProducts: PricedProduct[] = [];
    
    for (const item of productsToPrice) {
      const pid = String(item.pid || item.productId || '');
      const cjSku = String(item.productSku || item.sku || `CJ-${pid}`);
      const name = String(item.productNameEn || item.name || item.productName || '');
      const stock = Number(item.stock || item.inventory || 0);
      const listedNum = Number(item.listedNum || 0);
      
      // Get full product details for all images
      const fullDetails = productDetailsMap.get(pid);
      let images = extractAllImages(fullDetails || item);
      console.log(`[Search&Price] Product ${pid}: ${images.length} images from details`);
      
      // Fetch variants - we'll also extract images from these
      const variants = await getVariantsForProduct(token, base, pid);
      
      // Extract images from variants (each color variant often has its own image)
      const variantImages: string[] = [];
      const seenUrls = new Set(images);
      for (const v of variants) {
        const imgFields = ['variantImage', 'whiteImage', 'image', 'imageUrl', 'imgUrl', 'bigImage', 'variantImg', 'skuImage'];
        for (const field of imgFields) {
          const url = v[field];
          if (typeof url === 'string' && url.startsWith('http') && !seenUrls.has(url)) {
            seenUrls.add(url);
            variantImages.push(url);
          }
        }
      }
      
      if (variantImages.length > 0) {
        console.log(`[Search&Price] Product ${pid}: +${variantImages.length} images from ${variants.length} variants`);
        images = [...images, ...variantImages].slice(0, 50);
      }
      
      const pricedVariants: PricedVariant[] = [];
      
      if (variants.length === 0) {
        const sellPrice = Number(item.sellPrice || item.price || 0);
        const costSAR = usdToSar(sellPrice);
        
        let shippingPriceUSD = 0;
        let shippingPriceSAR = 0;
        let shippingAvailable = false;
        let deliveryDays = 'Unknown';
        let logisticName: string | undefined;
        let shippingError: string | undefined;
        
        try {
          const freight = await freightCalculate({
            countryCode: 'SA',
            pid: pid,
            quantity: 1,
          });
          
          if (freight.options.length > 0) {
            const cheapest = freight.options.reduce((a, b) => a.price < b.price ? a : b);
            shippingPriceUSD = cheapest.price;
            shippingPriceSAR = usdToSar(shippingPriceUSD);
            shippingAvailable = true;
            logisticName = cheapest.name;
            if (cheapest.logisticAgingDays) {
              const { min, max } = cheapest.logisticAgingDays;
              deliveryDays = max ? `${min}-${max} days` : `${min} days`;
            }
          } else {
            shippingError = 'No shipping options available to Saudi Arabia';
          }
        } catch (e: any) {
          shippingError = e?.message || 'Shipping calculation failed';
        }
        
        if (freeShippingOnly && shippingPriceUSD > 0) {
          continue;
        }
        
        const totalCostSAR = costSAR + shippingPriceSAR;
        const sellPriceSAR = calculateSellPriceWithMargin(totalCostSAR, profitMargin);
        const profitSAR = sellPriceSAR - totalCostSAR;
        
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
        });
      } else {
        for (const variant of variants.slice(0, 5)) {
          const variantId = String(variant.vid || variant.variantId || variant.id || '');
          const variantSku = String(variant.variantSku || variant.sku || variantId);
          const variantPriceUSD = Number(variant.variantSellPrice || variant.sellPrice || variant.price || 0);
          const costSAR = usdToSar(variantPriceUSD);
          
          let shippingPriceUSD = 0;
          let shippingPriceSAR = 0;
          let shippingAvailable = false;
          let deliveryDays = 'Unknown';
          let logisticName: string | undefined;
          let shippingError: string | undefined;
          
          try {
            const freight = await freightCalculate({
              countryCode: 'SA',
              pid: pid,
              sku: variantSku,
              quantity: 1,
            });
            
            if (freight.options.length > 0) {
              const cheapest = freight.options.reduce((a, b) => a.price < b.price ? a : b);
              shippingPriceUSD = cheapest.price;
              shippingPriceSAR = usdToSar(shippingPriceUSD);
              shippingAvailable = true;
              logisticName = cheapest.name;
              if (cheapest.logisticAgingDays) {
                const { min, max } = cheapest.logisticAgingDays;
                deliveryDays = max ? `${min}-${max} days` : `${min} days`;
              }
            } else {
              shippingError = 'No shipping options available to Saudi Arabia';
            }
          } catch (e: any) {
            shippingError = e?.message || 'Shipping calculation failed';
          }
          
          if (freeShippingOnly && shippingPriceUSD > 0) {
            continue;
          }
          
          const totalCostSAR = costSAR + shippingPriceSAR;
          const sellPriceSAR = calculateSellPriceWithMargin(totalCostSAR, profitMargin);
          const profitSAR = sellPriceSAR - totalCostSAR;
          
          pricedVariants.push({
            variantId,
            variantSku,
            variantPriceUSD,
            shippingAvailable,
            shippingPriceUSD,
            shippingPriceSAR,
            deliveryDays,
            logisticName,
            sellPriceSAR,
            totalCostSAR,
            profitSAR,
            error: shippingError,
          });
        }
      }
      
      if (pricedVariants.length === 0) {
        continue;
      }
      
      const successfulVariants = pricedVariants.filter(v => v.shippingAvailable).length;
      const prices = pricedVariants.map(v => v.sellPriceSAR);
      const minPriceSAR = Math.min(...prices);
      const maxPriceSAR = Math.max(...prices);
      const avgPriceSAR = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      
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
        variants: pricedVariants,
        successfulVariants,
        totalVariants: pricedVariants.length,
      });
    }
    
    const duration = Date.now() - startTime;
    console.log(`[Search&Price] Complete: ${pricedProducts.length} products priced in ${duration}ms`);
    
    const r = NextResponse.json({
      ok: true,
      products: pricedProducts,
      count: pricedProducts.length,
      duration,
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
