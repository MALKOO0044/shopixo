import { NextResponse } from 'next/server';
import { getAccessToken, freightCalculate } from '@/lib/cj/v2';
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
  name: string;
  image: string;
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
    return Array.isArray(data) ? data : (data?.list || data?.variants || []);
  } catch {
    return [];
  }
}

function calculateSellPriceWithMargin(landedCostSAR: number, profitMarginPercent: number): number {
  const margin = profitMarginPercent / 100;
  return computeRetailFromLanded(landedCostSAR, { margin });
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
    
    const pricedProducts: PricedProduct[] = [];
    
    for (const item of productsToPrice) {
      const pid = String(item.pid || item.productId || '');
      const name = String(item.productNameEn || item.name || item.productName || '');
      const image = String(item.productImage || item.image || item.mainImage || '');
      const stock = Number(item.stock || item.inventory || 0);
      const listedNum = Number(item.listedNum || 0);
      
      const variants = await getVariantsForProduct(token, base, pid);
      
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
        name,
        image,
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
