import { NextResponse } from 'next/server';
import { ensureAdmin } from '@/lib/auth/admin-guard';
import { loggerForRequest } from '@/lib/log';
import { getAccessToken, queryVariantInventory, freightCalculate } from '@/lib/cj/v2';
import { fetchJson } from '@/lib/http';

const CJ_BASE = process.env.CJ_API_BASE || 'https://developers.cjdropshipping.com/api2.0/v1';

export type EnrichedProduct = {
  pid: string;
  nameEn: string;
  nameAr: string | null;
  descriptionEn: string | null;
  descriptionAr: string | null;
  image: string | null;
  images: string[];
  supplierRating: number;
  colors: string[];
  sizes: string[];
  variants: Array<{
    sku: string;
    color: string | null;
    size: string | null;
    price: number;
    cjStock: number;
    factoryStock: number;
    totalStock: number;
  }>;
  totalCjStock: number;
  totalFactoryStock: number;
  totalStock: number;
  processingTimeHours: number | null;
  processingTimeDisplay: string | null;
  shippingToSA: {
    estimatedDays: { min?: number; max?: number } | null;
    shippingCost: number | null;
    shippingMethod: string | null;
  } | null;
  notes: string | null;
  sourceUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
};

async function fetchProductDetail(token: string, pid: string): Promise<any> {
  try {
    const res = await fetchJson<any>(`${CJ_BASE}/product/query?pid=${encodeURIComponent(pid)}`, {
      headers: {
        'CJ-Access-Token': token,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      timeoutMs: 15000,
    });
    return res?.data || null;
  } catch (e: any) {
    console.log(`[Enrich] Error fetching product detail for ${pid}:`, e?.message);
    return null;
  }
}

async function fetchProductVariants(token: string, pid: string): Promise<any[]> {
  try {
    const res = await fetchJson<any>(`${CJ_BASE}/product/variant/query?pid=${encodeURIComponent(pid)}`, {
      headers: {
        'CJ-Access-Token': token,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      timeoutMs: 15000,
    });
    const data = res?.data;
    return Array.isArray(data) ? data : (data?.list || data?.variants || []);
  } catch (e: any) {
    console.log(`[Enrich] Error fetching variants for ${pid}:`, e?.message);
    return [];
  }
}

function extractColorAndSize(variant: any): { color: string | null; size: string | null } {
  let color: string | null = null;
  let size: string | null = null;
  
  color = variant.color || variant.colour || variant.Color || null;
  size = variant.size || variant.Size || null;
  
  if (variant.attributes) {
    if (typeof variant.attributes === 'object' && !Array.isArray(variant.attributes)) {
      color = color || variant.attributes.color || variant.attributes.Color || variant.attributes.colour || null;
      size = size || variant.attributes.size || variant.attributes.Size || null;
    } else if (Array.isArray(variant.attributes)) {
      for (const attr of variant.attributes) {
        const key = String(attr?.name || attr?.key || '').toLowerCase();
        const val = String(attr?.value || attr?.v || '');
        if (key.includes('color') || key.includes('colour')) color = color || val;
        if (key.includes('size')) size = size || val;
      }
    }
  }
  
  if (Array.isArray(variant.attributeList)) {
    for (const attr of variant.attributeList) {
      const key = String(attr?.name || attr?.key || '').toLowerCase();
      const val = String(attr?.value || '');
      if (key.includes('color') || key.includes('colour')) color = color || val;
      if (key.includes('size')) size = size || val;
    }
  }
  
  const variantKey = variant.variantKey || variant.variantName || variant.skuName || '';
  if (typeof variantKey === 'string' && variantKey && (!color || !size)) {
    const parts = variantKey.split(/[\-\/|,;]+/).map(s => s.trim()).filter(Boolean);
    const sizeTokens = new Set(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL', '4XL', '5XL', 'ONE SIZE', 'FREE SIZE']);
    for (const p of parts) {
      if (!size && (sizeTokens.has(p.toUpperCase()) || /^\d{2}$/.test(p))) {
        size = p;
      } else if (!color && p.length > 1) {
        color = p;
      }
    }
  }
  
  return { color, size };
}

function formatProcessingTime(hours: number | null): string | null {
  if (hours === null || hours <= 0) return null;
  if (hours < 24) return `${hours} hours`;
  const days = Math.round(hours / 24);
  return days === 1 ? '1 day' : `${days} days`;
}

export async function GET(req: Request) {
  const log = loggerForRequest(req);
  try {
    const guard = await ensureAdmin();
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: guard.reason }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const pid = searchParams.get('pid');
    
    if (!pid) {
      return NextResponse.json({ ok: false, error: 'Missing pid parameter' }, { status: 400 });
    }
    
    const token = await getAccessToken();
    
    const [productDetail, rawVariants, inventoryData] = await Promise.all([
      fetchProductDetail(token, pid),
      fetchProductVariants(token, pid),
      queryVariantInventory(pid).catch(() => []),
    ]);
    
    if (!productDetail) {
      return NextResponse.json({ ok: false, error: 'Product not found' }, { status: 404 });
    }
    
    const inventoryBySku = new Map<string, { cjStock: number; factoryStock: number; totalStock: number }>();
    for (const inv of inventoryData) {
      inventoryBySku.set(inv.variantSku, {
        cjStock: inv.cjStock,
        factoryStock: inv.factoryStock,
        totalStock: inv.totalStock,
      });
    }
    
    const colorsSet = new Set<string>();
    const sizesSet = new Set<string>();
    const variants: EnrichedProduct['variants'] = [];
    
    for (const v of rawVariants) {
      const sku = v.variantSku || v.vid || v.sku || v.skuId || '';
      const { color, size } = extractColorAndSize(v);
      const price = Number(v.variantSellPrice || v.sellPrice || v.variantPrice || v.price || 0);
      
      if (color) colorsSet.add(color);
      if (size) sizesSet.add(size);
      
      const inv = inventoryBySku.get(sku);
      variants.push({
        sku,
        color,
        size,
        price,
        cjStock: inv?.cjStock || 0,
        factoryStock: inv?.factoryStock || 0,
        totalStock: inv?.totalStock || 0,
      });
    }
    
    const totalCjStock = variants.reduce((sum, v) => sum + v.cjStock, 0);
    const totalFactoryStock = variants.reduce((sum, v) => sum + v.factoryStock, 0);
    const totalStock = totalCjStock + totalFactoryStock;
    
    const processingTimeRaw = Number(productDetail.processingTime || productDetail.handleTime || productDetail.handlingTime || 0);
    const processingTimeHours = processingTimeRaw > 0 ? (processingTimeRaw <= 60 ? processingTimeRaw * 24 : processingTimeRaw) : null;
    
    let shippingToSA: EnrichedProduct['shippingToSA'] = null;
    try {
      const freight = await freightCalculate({
        countryCode: 'SA',
        pid: pid,
        quantity: 1,
      });
      if (freight.options.length > 0) {
        const best = freight.options.sort((a, b) => (a.logisticAgingDays?.min || 999) - (b.logisticAgingDays?.min || 999))[0];
        shippingToSA = {
          estimatedDays: best.logisticAgingDays || null,
          shippingCost: best.price,
          shippingMethod: best.name,
        };
      }
    } catch (e: any) {
      console.log(`[Enrich] Shipping calculation failed for ${pid}:`, e?.message);
    }
    
    const nameEn = productDetail.productNameEn || productDetail.nameEn || productDetail.englishName || productDetail.productName || productDetail.name || 'Untitled';
    const nameAr = productDetail.productNameAr || productDetail.nameAr || productDetail.arabicName || null;
    const descriptionEn = productDetail.productDescEn || productDetail.descriptionEn || productDetail.description || productDetail.productDesc || null;
    const descriptionAr = productDetail.productDescAr || productDetail.descriptionAr || null;
    
    const images: string[] = [];
    const mainImage = productDetail.productImage || productDetail.bigImage || productDetail.image || productDetail.mainImage || null;
    if (mainImage) images.push(mainImage);
    
    const imageArrays = [productDetail.imageList, productDetail.productImageList, productDetail.productImages];
    for (const arr of imageArrays) {
      if (Array.isArray(arr)) {
        for (const img of arr) {
          const url = typeof img === 'string' ? img : (img?.imageUrl || img?.url || null);
          if (url && !images.includes(url)) images.push(url);
        }
      }
    }
    
    const supplierRating = Number(productDetail.supplierScore || productDetail.supplierRating || productDetail.score || productDetail.rating || 0);
    
    const enriched: EnrichedProduct = {
      pid,
      nameEn,
      nameAr,
      descriptionEn,
      descriptionAr,
      image: images[0] || null,
      images,
      supplierRating,
      colors: Array.from(colorsSet).sort(),
      sizes: Array.from(sizesSet).sort((a, b) => {
        const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL', '4XL', '5XL'];
        const aIdx = sizeOrder.indexOf(a.toUpperCase());
        const bIdx = sizeOrder.indexOf(b.toUpperCase());
        if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
        if (aIdx >= 0) return -1;
        if (bIdx >= 0) return 1;
        return a.localeCompare(b);
      }),
      variants,
      totalCjStock,
      totalFactoryStock,
      totalStock,
      processingTimeHours,
      processingTimeDisplay: formatProcessingTime(processingTimeHours),
      shippingToSA,
      notes: productDetail.notes || productDetail.remark || productDetail.memo || null,
      sourceUrl: productDetail.productUrl || productDetail.url || null,
      categoryId: productDetail.categoryId || null,
      categoryName: productDetail.categoryName || null,
    };
    
    const r = NextResponse.json({ ok: true, data: enriched }, { headers: { 'Cache-Control': 'no-store' } });
    r.headers.set('x-request-id', log.requestId);
    return r;
    
  } catch (e: any) {
    console.error('[Enrich] Error:', e);
    const r = NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
    r.headers.set('x-request-id', log.requestId);
    return r;
  }
}
