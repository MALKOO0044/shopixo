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
  description?: string;
  overview?: string;
  productInfo?: string;
  sizeInfo?: string;
  productNote?: string;
  packingList?: string;
  rating?: number;
  categoryName?: string;
  productWeight?: number;
  packLength?: number;
  packWidth?: number;
  packHeight?: number;
  material?: string;
  productType?: string;
  sizeChartImages?: string[];
};

async function fetchCjProductPage(
  token: string, 
  base: string, 
  categoryId: string | null,
  pageNum: number
): Promise<{ list: any[]; total: number }> {
  const params = new URLSearchParams();
  params.set('page', String(pageNum));
  params.set('size', '20');
  // Note: features parameter removed for stable search - descriptions fetched via hydration step
  
  if (categoryId && categoryId !== 'all' && !categoryId.startsWith('first-') && !categoryId.startsWith('second-')) {
    if (categoryId.startsWith('lv2-')) {
      params.set('lv2categoryList', categoryId.replace('lv2-', ''));
    } else if (categoryId.startsWith('lv3-')) {
      params.set('lv3categoryList', categoryId.replace('lv3-', ''));
    } else {
      params.set('categoryId', categoryId);
    }
  }
  
  const url = `${base}/product/listV2?${params}`;
  console.log(`[Search&Price] Fetching listV2: ${url}`);
  
  try {
    const res = await fetchJson<any>(url, {
      headers: {
        'CJ-Access-Token': token,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      timeoutMs: 30000,
    });
    
    // Handle multiple possible response structures from CJ listV2 API
    let productList: any[] = [];
    let total = 0;
    
    // Structure 1: data.content[0].productList (standard listV2)
    const content = res?.data?.content || [];
    if (Array.isArray(content) && content[0]?.productList) {
      productList = content[0].productList;
      total = res?.data?.totalRecords || 0;
    }
    // Structure 2: data.list (fallback format)
    else if (res?.data?.list) {
      productList = res.data.list;
      total = res?.data?.total || res?.data?.totalRecords || 0;
    }
    // Structure 3: data is the array directly
    else if (Array.isArray(res?.data)) {
      productList = res.data;
      total = productList.length;
    }
    
    console.log(`[Search&Price] Page ${pageNum} returned ${productList.length} items (total: ${total})`);
    
    if (productList.length > 0) {
      const sample = productList[0];
      console.log(`[Search&Price] Sample product: pid=${sample.id || sample.pid}, name=${sample.nameEn?.slice(0, 50)}, desc=${sample.description ? 'YES' : 'NO'}`);
      console.log(`[Search&Price] Sample fields: ${Object.keys(sample).slice(0, 15).join(', ')}`);
    } else {
      console.log(`[Search&Price] Response structure: ${JSON.stringify(Object.keys(res?.data || {}))}`);
    }
    
    return { list: productList, total };
  } catch (e: any) {
    console.error(`[Search&Price] ListV2 fetch error:`, e?.message);
    console.log(`[Search&Price] Falling back to old list endpoint...`);
    
    const fallbackParams = new URLSearchParams();
    fallbackParams.set('pageNum', String(pageNum));
    if (categoryId && categoryId !== 'all' && !categoryId.startsWith('first-') && !categoryId.startsWith('second-')) {
      fallbackParams.set('categoryId', categoryId);
    }
    
    try {
      const fallbackRes = await fetchJson<any>(`${base}/product/list?${fallbackParams}`, {
        headers: {
          'CJ-Access-Token': token,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        timeoutMs: 30000,
      });
      
      const list = fallbackRes?.data?.list || [];
      const total = fallbackRes?.data?.total || 0;
      return { list, total };
    } catch (e2: any) {
      console.error(`[Search&Price] Fallback fetch error:`, e2?.message);
      return { list: [], total: 0 };
    }
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
      
      // Also log variantKey which often contains color info
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
      
      // Get full product details for all images and additional info
      const fullDetails = productDetailsMap.get(pid);
      let images = extractAllImages(fullDetails || item);
      console.log(`[Search&Price] Product ${pid}: ${images.length} images from details`);
      
      // Extract additional product info from fullDetails or item
      const source = fullDetails || item;
      const rawDescriptionHtml = String(source.description || source.productDescription || source.descriptionEn || source.productDescEn || source.desc || '').trim();
      const rating = source.rating !== undefined ? Number(source.rating) : (source.score !== undefined ? Number(source.score) : undefined);
      const categoryName = String(source.categoryName || source.categoryNameEn || source.category || '').trim() || undefined;
      const productWeight = source.productWeight !== undefined ? Number(source.productWeight) : (source.weight !== undefined ? Number(source.weight) : undefined);
      const packLength = source.packLength !== undefined ? Number(source.packLength) : (source.length !== undefined ? Number(source.length) : undefined);
      const packWidth = source.packWidth !== undefined ? Number(source.packWidth) : (source.width !== undefined ? Number(source.width) : undefined);
      const packHeight = source.packHeight !== undefined ? Number(source.packHeight) : (source.height !== undefined ? Number(source.height) : undefined);
      const material = String(source.material || source.productMaterial || source.materialNameEn || source.materialName || '').trim() || undefined;
      const productType = String(source.productType || source.type || source.productTypeName || '').trim() || undefined;
      
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
        if (productWeight && productWeight > 0) specs.push(`Weight: ${productWeight}g`);
        if (packLength && packWidth && packHeight) {
          specs.push(`Dimensions: ${packLength} × ${packWidth} × ${packHeight} cm`);
        }
        // Don't include Category or Type alone - not useful as standalone specs
        // Only include category if we have other specs too
        if (specs.length > 0 && categoryName && !categoryName.includes('_')) {
          specs.push(`Category: ${categoryName}`);
        }
        // Never include internal type like "ORDINARY_PRODUCT"
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
      let overview: string | undefined;
      const categoryDisplay = source.threeCategoryName || source.twoCategoryName || source.oneCategoryName || categoryName || '';
      const overviewParts: string[] = [];
      if (categoryDisplay && !categoryDisplay.includes('_')) {
        overviewParts.push(`Category: ${categoryDisplay}`);
      }
      if (material && material.length > 1 && !/[\u4e00-\u9fff]/.test(material)) {
        overviewParts.push(`Material: ${material}`);
      }
      if (productWeight && productWeight > 0) {
        overviewParts.push(`Weight: ${productWeight}g`);
      }
      if (source.deliveryCycle) {
        overviewParts.push(`Delivery: ${source.deliveryCycle} days`);
      }
      if (overviewParts.length > 0) {
        overview = overviewParts.join('<br/>');
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
      
      // If productInfo is still empty, try to build specs from variant data
      let finalProductInfo = productInfo;
      if (!finalProductInfo && variants.length > 0) {
        const variantSpecs: string[] = [];
        const colors = new Set<string>();
        const sizes = new Set<string>();
        
        // Extended color list
        const colorPattern = /\b(Black|White|Red|Blue|Green|Yellow|Pink|Purple|Orange|Brown|Grey|Gray|Beige|Navy|Khaki|Apricot|Wine|Coffee|Camel|Cream|Rose|Gold|Silver|Ivory|Mint|Coral|Burgundy|Maroon|Olive|Teal|Turquoise|Lavender|Lilac|Peach|Tan|Charcoal|Sky Blue|Dark Blue|Light Blue|Light Green|Dark Green|Light Pink|Dark Pink|Off White|Nude)\b/gi;
        
        for (const v of variants) {
          // Check multiple variant fields for color/size info
          const fieldsToCheck = [
            v.variantNameEn, v.variantName, v.name,
            v.variantKey, v.variantSku, v.sku,
            v.color, v.colour, v.colorNameEn, v.colorName,
            v.size, v.sizeNameEn, v.sizeName
          ].filter(Boolean).map(x => String(x).trim());
          
          for (const field of fieldsToCheck) {
            // Extract colors
            const colorMatches = field.match(colorPattern);
            if (colorMatches) {
              for (const c of colorMatches) {
                colors.add(c.charAt(0).toUpperCase() + c.slice(1).toLowerCase());
              }
            }
            
            // Extract sizes - be more flexible
            const sizeMatches = field.match(/\b(XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|5XL|6XL|One Size|Free Size|EU\s*\d+|US\s*\d+|\d+(?:cm)?)\b/gi);
            if (sizeMatches) {
              for (const s of sizeMatches) {
                sizes.add(s.toUpperCase());
              }
            }
          }
          
          // Check variant properties
          const vProps = v.variantPropertyList || v.propertyList || v.properties || [];
          if (Array.isArray(vProps)) {
            for (const p of vProps) {
              const propName = String(p.propertyNameEn || p.propertyName || p.name || '').toLowerCase();
              const propValue = String(p.propertyValueNameEn || p.propertyValueName || p.value || p.name || '').trim();
              if (propValue && propValue.length > 0) {
                if (propName.includes('color') || propName.includes('colour')) {
                  // Clean the color value
                  const cleanColor = propValue.replace(/[\u4e00-\u9fff]/g, '').trim();
                  if (cleanColor && /[a-zA-Z]/.test(cleanColor)) {
                    colors.add(cleanColor);
                  }
                } else if (propName.includes('size')) {
                  const cleanSize = propValue.replace(/[\u4e00-\u9fff]/g, '').trim();
                  if (cleanSize) {
                    sizes.add(cleanSize);
                  }
                }
              }
            }
          }
        }
        
        if (colors.size > 0) variantSpecs.push(`Colors: ${[...colors].slice(0, 15).join(', ')}`);
        if (sizes.size > 0) variantSpecs.push(`Sizes: ${[...sizes].slice(0, 15).join(', ')}`);
        
        if (variantSpecs.length > 0) {
          finalProductInfo = variantSpecs.join('<br/>');
          console.log(`[Search&Price] Product ${pid}: Built specs from ${variants.length} variants - ${colors.size} colors, ${sizes.size} sizes`);
        } else {
          console.log(`[Search&Price] Product ${pid}: No colors/sizes found in ${variants.length} variants`);
        }
      }
      
      // If still no product info, set to undefined (don't show empty section)
      if (!finalProductInfo || finalProductInfo.trim().length === 0) {
        finalProductInfo = undefined;
      }
      
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
        description,
        overview,
        productInfo: finalProductInfo,
        sizeInfo,
        productNote,
        packingList,
        rating,
        categoryName,
        productWeight,
        packLength,
        packWidth,
        packHeight,
        material,
        productType,
        sizeChartImages: sizeChartImages.length > 0 ? sizeChartImages : undefined,
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
