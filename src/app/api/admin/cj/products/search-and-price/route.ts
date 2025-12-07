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
  categoryIds: string[], 
  pageNum: number, 
  pageSize: number
): Promise<{ list: any[]; total: number }> {
  const params = new URLSearchParams();
  params.set('pageSize', String(pageSize));
  params.set('pageNum', String(pageNum));
  
  if (categoryIds.length === 1 && categoryIds[0] !== 'all') {
    params.set('categoryId', categoryIds[0]);
  }
  
  try {
    const res = await fetchJson<any>(`${base}/product/list?${params}`, {
      headers: {
        'CJ-Access-Token': token,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      timeoutMs: 20000,
    });
    return {
      list: res?.data?.list || [],
      total: res?.data?.total || 0,
    };
  } catch {
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
    const minStock = Number(searchParams.get('minStock') || 5);
    const profitMargin = Math.max(1, Number(searchParams.get('profitMargin') || 8));
    const popularity = searchParams.get('popularity') || 'any';
    const freeShippingOnly = searchParams.get('freeShippingOnly') === '1';

    console.log(`[Search&Price] Starting search: categories=${categoryIds.join(',')}, qty=${quantity}, price=${minPrice}-${maxPrice}, margin=${profitMargin}%`);

    const token = await getAccessToken();
    const base = process.env.CJ_API_BASE || 'https://developers.cjdropshipping.com/api2.0/v1';
    
    const pageSize = 50;
    const maxPages = Math.min(100, Math.ceil(quantity * 5 / pageSize));
    
    const candidateProducts: any[] = [];
    const seenPids = new Set<string>();
    const startTime = Date.now();
    const maxDurationMs = 120000;
    
    for (let page = 1; page <= maxPages; page++) {
      if (Date.now() - startTime > maxDurationMs) {
        console.log(`[Search&Price] Timeout at page ${page}`);
        break;
      }
      
      if (candidateProducts.length >= quantity * 2) {
        console.log(`[Search&Price] Enough candidates at page ${page}`);
        break;
      }
      
      const pageResult = await fetchCjProductPage(token, base, categoryIds, page, pageSize);
      
      if (pageResult.list.length === 0) {
        console.log(`[Search&Price] Empty page at ${page}`);
        break;
      }
      
      for (const item of pageResult.list) {
        const pid = String(item.pid || item.productId || '');
        if (!pid || seenPids.has(pid)) continue;
        seenPids.add(pid);
        
        const sellPrice = Number(item.sellPrice || item.price || 0);
        if (sellPrice < minPrice || sellPrice > maxPrice) continue;
        
        const stock = Number(item.stock || item.inventory || 0);
        if (stock < minStock) continue;
        
        const listedNum = Number(item.listedNum || 0);
        if (popularity === 'high' && listedNum < 1000) continue;
        if (popularity === 'medium' && (listedNum < 100 || listedNum >= 1000)) continue;
        if (popularity === 'low' && listedNum >= 100) continue;
        
        candidateProducts.push(item);
      }
      
      if (page % 10 === 0) {
        console.log(`[Search&Price] Page ${page}: ${candidateProducts.length} candidates`);
      }
    }
    
    console.log(`[Search&Price] Found ${candidateProducts.length} candidate products, processing top ${quantity}`);
    
    const productsToPrice = candidateProducts.slice(0, quantity);
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
            console.warn(`[Search&Price] No shipping options for product ${pid}`);
            shippingError = 'No shipping options available to Saudi Arabia';
          }
        } catch (e: any) {
          console.error(`[Search&Price] Freight calculation failed for ${pid}:`, e?.message);
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
        for (const variant of variants) {
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
              console.warn(`[Search&Price] No shipping options for variant ${variantSku} of product ${pid}`);
              shippingError = 'No shipping options available to Saudi Arabia';
            }
          } catch (e: any) {
            console.error(`[Search&Price] Freight calculation failed for variant ${variantSku}:`, e?.message);
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
    console.error('[Search&Price] Error:', e?.message);
    const r = NextResponse.json(
      { ok: false, error: e?.message || 'Search and price failed' }, 
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
    r.headers.set('x-request-id', loggerForRequest(req).requestId);
    return r;
  }
}
