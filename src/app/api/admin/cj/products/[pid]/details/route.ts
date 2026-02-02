import { NextResponse } from 'next/server';
import { ensureAdmin } from '@/lib/auth/admin-guard';
import { getAccessToken, freightCalculate, fetchProductDetailsByPid, getInventoryByPid, queryVariantInventory, getProductVariants } from '@/lib/cj/v2';
import type { PricedProduct, PricedVariant, InventoryVariant, ProductInventory } from '@/components/admin/import/preview/types';
import { computeRating } from '@/lib/rating/engine';
import { createClient } from '@supabase/supabase-js';
import { hasTable } from '@/lib/db-features';

/**
 * GET /api/admin/cj/products/[pid]/details
 * 
 * Returns a full PricedProduct for a single CJ product, using the same
 * comprehensive data processing as the search-and-price route.
 * 
 * This ensures 100% accurate data display matching the Product Discovery preview modal.
 */
export async function GET(
  req: Request,
  { params }: { params: { pid: string } }
) {
  try {
    const guard = await ensureAdmin();
    if (!guard.ok) {
      return NextResponse.json(
        { ok: false, error: guard.reason },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const pid = params.pid;
    if (!pid) {
      return NextResponse.json(
        { ok: false, error: 'Product ID required' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { searchParams } = new URL(req.url);
    const profitMargin = Math.max(1, Number(searchParams.get('profitMargin') || 40));

    console.log(`[ProductDetails] Fetching full details for product ${pid}`);
    const startTime = Date.now();

    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json(
        { ok: false, error: 'Failed to authenticate with CJ API' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Fetch full product details
    const fullDetails = await fetchProductDetailsByPid(pid);
    if (!fullDetails) {
      return NextResponse.json(
        { ok: false, error: 'Product not found in CJ API' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const source = fullDetails;
    const name = String(source.productNameEn || source.name || source.productName || '');
    const cjSku = String(source.productSku || source.sku || `CJ-${pid}`);

    // No external ratings: compute internal rating later
    let rating: number | undefined;

    // --- Fetch inventory ---
    let realInventory: ProductInventory | null = null;
    let inventoryStatus: 'ok' | 'error' | 'partial' = 'ok';
    let inventoryErrorMessage: string | undefined;
    const variantStockMap = new Map<string, { cjStock: number; factoryStock: number; totalStock: number }>();
    
    const normalizeKey = (s: string | undefined | null): string => {
      if (!s) return '';
      return String(s).toLowerCase().trim().replace(/[\s\-_\.]/g, '');
    };

    const getVariantStock = (identifiers: {
      vid?: string;
      variantId?: string;
      sku?: string;
      variantKey?: string;
      variantName?: string;
    }): { cjStock: number; factoryStock: number; totalStock: number } | undefined => {
      const keysToTry = [
        normalizeKey(identifiers.sku),
        normalizeKey(identifiers.vid),
        normalizeKey(identifiers.variantId),
        normalizeKey(identifiers.variantKey),
        normalizeKey(identifiers.variantName),
      ].filter(k => k.length > 0);
      
      for (const key of keysToTry) {
        const stock = variantStockMap.get(key);
        if (stock) return stock;
      }
      
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

    let variantInventory: Awaited<ReturnType<typeof queryVariantInventory>> = [];
    
    try {
      const invResult = await getInventoryByPid(pid);
      if (invResult) {
        realInventory = {
          totalCJ: invResult.totalCJ,
          totalFactory: invResult.totalFactory,
          totalAvailable: invResult.totalAvailable,
          warehouses: invResult.warehouses,
        };
      } else {
        inventoryStatus = 'partial';
        inventoryErrorMessage = 'Could not fetch warehouse inventory';
      }

      variantInventory = await queryVariantInventory(pid);
      if (variantInventory && variantInventory.length > 0) {
        for (const vi of variantInventory) {
          const stockData = {
            cjStock: vi.cjStock,
            factoryStock: vi.factoryStock,
            totalStock: vi.totalStock,
          };
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
        }
      }
    } catch (e: any) {
      console.log(`[ProductDetails] Error fetching inventory: ${e?.message}`);
      inventoryStatus = 'error';
      inventoryErrorMessage = e?.message || 'Failed to fetch inventory data';
    }

    // Build inventoryVariants array
    const inventoryVariants: InventoryVariant[] = [];
    if (variantInventory && variantInventory.length > 0) {
      for (const vi of variantInventory) {
        if (vi.totalStock <= 0) continue;
        
        const variantKeyRaw = String(vi.variantKey || vi.variantName || vi.variantSku || '');
        let shortName = variantKeyRaw.replace(/[\u4e00-\u9fff]/g, '').trim();
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
    }

    const stock = realInventory?.totalAvailable ?? Number(source.stock || 0);
    const totalVerifiedInventory = realInventory?.totalCJ ?? 0;
    const totalUnVerifiedInventory = realInventory?.totalFactory ?? 0;
    const listedNum = Number(source.listedNum || 0);

    // --- Extract images ---
    const images = extractAllImages(source);
    console.log(`[ProductDetails] Extracted ${images.length} images`);

    // --- Extract product info fields ---
    const rawDescriptionHtml = String(source.description || source.productDescription || source.descriptionEn || source.productDescEn || source.desc || '').trim();
    const categoryName = String(source.categoryName || source.categoryNameEn || source.category || '').trim() || undefined;

    // Weight
    const weightCandidates: Array<{ field: string; value: any }> = [
      { field: 'packWeight', value: source.packWeight },
      { field: 'packingWeight', value: source.packingWeight },
      { field: 'productWeight', value: source.productWeight },
      { field: 'weight', value: source.weight },
      { field: 'grossWeight', value: source.grossWeight },
      { field: 'netWeight', value: source.netWeight },
    ];
    
    let productWeight: number | undefined;
    for (const { value } of weightCandidates) {
      if (value !== undefined && value !== null && value !== '') {
        const numVal = Number(value);
        if (Number.isFinite(numVal) && numVal > 0) {
          productWeight = numVal < 30 ? Math.round(numVal * 1000) : Math.round(numVal);
          break;
        }
      }
    }

    const packLength = source.packLength !== undefined ? Number(source.packLength) : undefined;
    const packWidth = source.packWidth !== undefined ? Number(source.packWidth) : undefined;
    const packHeight = source.packHeight !== undefined ? Number(source.packHeight) : undefined;
    const productType = String(source.productType || source.type || '').trim() || undefined;

    // Parse JSON arrays
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

    let material = source.materialParsed || '';
    if (!material) {
      const rawMaterial = source.material || source.productMaterial || source.materialNameEn || source.materialName || '';
      material = parseCjJsonArray(rawMaterial);
    }
    material = material.trim() || undefined;

    let packingInfo = source.packingParsed || '';
    if (!packingInfo) {
      const rawPacking = source.packingNameEn || source.packingName || source.packingList || '';
      packingInfo = parseCjJsonArray(rawPacking);
    }
    packingInfo = packingInfo.trim() || undefined;

    // Sanitize HTML
    const sanitizeHtml = (html: string): string | undefined => {
      if (!html || typeof html !== 'string') return undefined;
      let cleaned = html
        .replace(/<a[^>]*href=[^>]*(1688|taobao|alibaba|aliexpress|tmall)[^>]*>.*?<\/a>/gi, '')
        .replace(/https?:\/\/[^\s<>"]*?(1688|taobao|alibaba|aliexpress|tmall)[^\s<>"]*/gi, '')
        .replace(/<[^>]*>(.*?(微信|QQ|联系|客服|淘宝|阿里巴巴|天猫|拼多多|抖音|快手).*?)<\/[^>]*>/gi, '')
        .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
        .replace(/<(\w+)[^>]*>\s*<\/\1>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      const textOnly = cleaned.replace(/<[^>]*>/g, '').trim();
      const hasEnglish = /[a-zA-Z]/.test(textOnly);
      const hasNumbers = /\d/.test(textOnly);
      
      if (!hasEnglish && !hasNumbers && textOnly.length === 0) return undefined;
      return cleaned.length > 0 ? cleaned : undefined;
    };

    const description = sanitizeHtml(rawDescriptionHtml);

    // Build overview
    const overviewParts: string[] = [];
    const categoryDisplay = source.threeCategoryName || source.twoCategoryName || source.oneCategoryName || categoryName || '';
    if (categoryDisplay && !categoryDisplay.includes('_')) {
      overviewParts.push(`Category: ${categoryDisplay}`);
    }
    if (material && !/[\u4e00-\u9fff]/.test(String(material))) {
      overviewParts.push(`Material: ${material}`);
    }
    if (packingInfo && !/[\u4e00-\u9fff]/.test(String(packingInfo))) {
      overviewParts.push(`Package: ${packingInfo}`);
    }
    if (productWeight && productWeight > 0) {
      overviewParts.push(`Weight: ${productWeight}g`);
    }
    if (packLength && packWidth && packHeight) {
      overviewParts.push(`Dimensions: ${packLength} × ${packWidth} × ${packHeight} cm`);
    }
    if (source.deliveryCycle) {
      overviewParts.push(`Delivery: ${source.deliveryCycle} days`);
    }
    if (source.entryCode && source.entryNameEn) {
      overviewParts.push(`HS Code: ${source.entryCode}`);
    }
    const overview = overviewParts.length > 0 ? overviewParts.join('<br/>') : undefined;

    // Extract size info
    let sizeInfo: string | undefined;
    const sizeLines: string[] = [];
    if (packLength && packWidth && packHeight) {
      sizeLines.push(`Package Size: ${packLength} × ${packWidth} × ${packHeight} cm`);
    }
    const sizePropList = source.productPropertyList || source.propertyList || [];
    if (Array.isArray(sizePropList)) {
      for (const prop of sizePropList) {
        const propName = String(prop.propertyNameEn || prop.propertyName || prop.name || '').toLowerCase();
        if (propName.includes('size') || propName.includes('dimension') || propName.includes('length')) {
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

    // Size chart images
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

    // Extract packing list
    let rawPackingList = String(source.packingList || source.packing || source.packageContent || '').trim();
    const packingList = sanitizeHtml(rawPackingList) || undefined;

    // Extract product note
    const rawProductNote = String(source.productNote || source.note || source.notes || '').trim();
    const productNote = sanitizeHtml(rawProductNote) || undefined;

    // --- Fetch variants ---
    const base = process.env.CJ_API_BASE || 'https://developers.cjdropshipping.com/api2.0/v1';
    const variants = await getProductVariants(pid);
    console.log(`[ProductDetails] Fetched ${variants.length} variants`);

    // Extract colors, sizes, models from variants
    const colors = new Set<string>();
    const sizes = new Set<string>();
    const models = new Set<string>();

    const colorList = ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Purple', 'Orange', 'Brown', 'Grey', 'Gray', 'Beige', 'Navy', 'Khaki', 'Apricot', 'Wine', 'Coffee', 'Camel', 'Cream', 'Rose', 'Gold', 'Silver', 'Ivory', 'Mint', 'Coral', 'Burgundy', 'Maroon', 'Olive', 'Teal', 'Turquoise', 'Lavender', 'Lilac', 'Peach', 'Tan', 'Charcoal', 'Violet', 'Nude'];
    const colorSet = new Set(colorList.map(c => c.toLowerCase()));
    const colorTestPattern = /\b(Black|White|Red|Blue|Green|Yellow|Pink|Purple|Orange|Brown|Grey|Gray|Beige|Navy|Khaki|Apricot|Wine|Coffee|Camel|Cream|Rose|Gold|Silver|Ivory|Mint|Coral|Burgundy|Maroon|Olive|Teal|Turquoise|Lavender|Lilac|Peach|Tan|Charcoal|Violet|Nude)\b/i;
    const clothingSizePattern = /^(XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|5XL|6XL|One Size|Free Size)$/i;
    const devicePattern = /\b(iPhone|Samsung|Xiaomi|Huawei|Redmi|OPPO|Vivo|OnePlus|Pixel|iPad|Galaxy)/i;

    const isColor = (s: string): boolean => {
      const lower = s.toLowerCase().trim();
      if (colorSet.has(lower)) return true;
      return colorTestPattern.test(s);
    };

    const isClothingSize = (s: string): boolean => clothingSizePattern.test(s.trim());
    const isDeviceModel = (s: string): boolean => devicePattern.test(s);

    for (const v of variants) {
      const explicitColor = v.color || v.colour || v.colorNameEn || v.colorName;
      const explicitSize = v.size || v.sizeNameEn || v.sizeName;
      
      if (explicitColor) {
        const cleanColor = String(explicitColor).replace(/[\u4e00-\u9fff]/g, '').trim();
        if (cleanColor && /[a-zA-Z]/.test(cleanColor)) {
          colors.add(cleanColor);
        }
      }
      
      if (explicitSize) {
        const cleanSize = String(explicitSize).replace(/[\u4e00-\u9fff]/g, '').trim();
        if (cleanSize) {
          if (isDeviceModel(cleanSize)) {
            models.add(cleanSize);
          } else {
            sizes.add(cleanSize);
          }
        }
      }

      // Parse variantKey
      if (v.variantKey) {
        const variantKeyRaw = String(v.variantKey).replace(/[\u4e00-\u9fff]/g, '').trim();
        const parts = variantKeyRaw.split(/[-\/|_]/).map(p => p.trim()).filter(Boolean);
        
        for (const part of parts) {
          if (isColor(part)) {
            colors.add(part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
          } else if (isDeviceModel(part)) {
            models.add(part);
          } else if (isClothingSize(part)) {
            sizes.add(part.toUpperCase());
          } else if (part.length < 20) {
            sizes.add(part);
          }
        }
      }
    }

    const extractedColors = [...colors].slice(0, 20);
    const extractedSizes = [...sizes].slice(0, 20);
    const extractedModels = [...models].slice(0, 25);

    // Build product info with variant colors/sizes
    const allSpecs: string[] = [];
    if (material) allSpecs.push(`Material: ${material}`);
    if (packingInfo) allSpecs.push(`Package: ${packingInfo}`);
    if (productWeight) allSpecs.push(`Weight: ${productWeight}g`);
    if (extractedColors.length > 0) allSpecs.push(`Colors: ${extractedColors.join(', ')}`);
    if (extractedSizes.length > 0) allSpecs.push(`Sizes: ${extractedSizes.join(', ')}`);
    if (extractedModels.length > 0) allSpecs.push(`Compatible Devices: ${extractedModels.join(', ')}`);
    const productInfo = allSpecs.length > 0 ? allSpecs.join('<br/>') : undefined;

    // --- Build priced variants with shipping ---
    const pricedVariants: PricedVariant[] = [];
    const usdToSar = (usd: number) => usd * 3.75; // SAR conversion

    const findCJPacketOrdinary = (options: any[]) => {
      return options.find((o: any) => 
        /CJ\s*Packet\s*Ordinary/i.test(o.name || '') ||
        o.code === 'CJPACKETORDINARY' ||
        /ordinary/i.test(o.code || '')
      ) || options[0];
    };

    const calculateSellPriceWithMargin = (totalCost: number, marginPercent: number): number => {
      const minProfit = 10 * 3.75; // $10 min profit in SAR
      const targetPrice = totalCost * (1 + marginPercent / 100);
      const withMinProfit = totalCost + minProfit;
      const rawPrice = Math.max(targetPrice, withMinProfit);
      
      // Smart rounding to .99 prices
      const priceInUsd = rawPrice / 3.75;
      let roundedUsd: number;
      if (priceInUsd < 10) roundedUsd = Math.ceil(priceInUsd) - 0.01;
      else if (priceInUsd < 20) roundedUsd = Math.ceil(priceInUsd / 5) * 5 - 0.01;
      else if (priceInUsd < 50) roundedUsd = Math.ceil(priceInUsd / 5) * 5 - 0.01;
      else roundedUsd = Math.ceil(priceInUsd / 10) * 10 - 0.01;
      
      return Math.round(roundedUsd * 3.75 * 100) / 100;
    };

    // Process up to 10 variants for shipping quotes
    const variantsToProcess = variants.slice(0, 10);
    
    for (const variant of variantsToProcess) {
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
        try {
          const freight = await freightCalculate({
            countryCode: 'US',
            vid: variantId,
            quantity: 1,
          });
          
          if (freight.ok && freight.options.length > 0) {
            const cjPacket = findCJPacketOrdinary(freight.options);
            if (cjPacket) {
              shippingPriceUSD = cjPacket.price;
              shippingPriceSAR = usdToSar(shippingPriceUSD);
              shippingAvailable = true;
              logisticName = cjPacket.name;
              if (cjPacket.logisticAgingDays) {
                const { min, max } = cjPacket.logisticAgingDays;
                deliveryDays = max ? `${min}-${max} days` : `${min} days`;
              }
            }
          } else if (!freight.ok) {
            shippingError = freight.message;
          }
        } catch (e: any) {
          shippingError = e?.message || 'Shipping failed';
        }
      }

      const variantStock = getVariantStock({
        vid: variantId,
        sku: variantSku,
        variantKey: variant.variantKey,
        variantName: variantName,
      });

      if (shippingAvailable) {
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
          variantName,
          variantImage,
          size,
          color,
          stock: variantStock?.totalStock,
          cjStock: variantStock?.cjStock,
          factoryStock: variantStock?.factoryStock,
          error: shippingError,
        });
      } else {
        // Include variant even without shipping for display
        pricedVariants.push({
          variantId,
          variantSku,
          variantPriceUSD,
          shippingAvailable: false,
          shippingPriceUSD: 0,
          shippingPriceSAR: 0,
          deliveryDays: 'Unknown',
          sellPriceSAR: 0,
          totalCostSAR: costSAR,
          profitSAR: 0,
          variantName,
          variantImage,
          size,
          color,
          stock: variantStock?.totalStock,
          cjStock: variantStock?.cjStock,
          factoryStock: variantStock?.factoryStock,
          error: shippingError || 'No shipping data',
        });
      }
    }

    // Calculate price ranges
    const successfulVariants = pricedVariants.filter(v => v.shippingAvailable).length;
    const prices = pricedVariants.filter(v => v.sellPriceSAR > 0).map(v => v.sellPriceSAR);
    const minPriceSAR = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPriceSAR = prices.length > 0 ? Math.max(...prices) : 0;
    const avgPriceSAR = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;

    // Time estimates
    const parseTimeValue = (val: any): { display: string | undefined; hours: number | undefined } => {
      if (!val) return { display: undefined, hours: undefined };
      const strVal = String(val).trim();
      if (!strVal) return { display: undefined, hours: undefined };
      const hasUnits = /day|hour|week/i.test(strVal);
      const display = hasUnits ? strVal : `${strVal} days`;
      const numMatch = strVal.match(/^(\d+)/);
      const hours = numMatch ? Number(numMatch[1]) * 24 : undefined;
      return { display, hours: (hours && !isNaN(hours)) ? hours : undefined };
    };

    const processingParsed = parseTimeValue(source.processDay || source.processingTime);
    const deliveryParsed = parseTimeValue(source.deliveryCycle);
    
    const originCountry = String(source.originCountry || source.countryOrigin || '').trim() || undefined;
    const hsCode = source.entryCode ? `${source.entryCode}${source.entryNameEn ? ` (${source.entryNameEn})` : ''}` : undefined;
    const videoUrl = String(source.videoUrl || source.video || source.productVideo || '').trim() || undefined;

    // Compute internal rating from signals
    let ratingConfidenceVal: number | undefined;
    try {
      const imagesCount = Array.isArray(images) ? images.length : 0;
      const variantCount = Array.isArray(variantsToProcess) ? variantsToProcess.length : 0;
      const minVariantUsd = pricedVariants.length > 0 ? Math.min(...pricedVariants.map(v => v.variantPriceUSD || 0)) : 0;
      const ratingOut = computeRating({
        imageCount: imagesCount,
        stock: typeof stock === 'number' ? stock : 0,
        variantCount,
        qualityScore: 0.6,
        priceUsd: minVariantUsd,
        sentiment: 0,
        orderVolume: 0,
      });
      rating = ratingOut.displayedRating;
      ratingConfidenceVal = ratingOut.ratingConfidence;

      // Snapshot signals if table exists
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (url && key) {
          const admin = createClient(url, key);
          const hasSignals = await hasTable('product_rating_signals').catch(() => false);
          if (hasSignals) {
            await admin.from('product_rating_signals').insert({
              product_id: null,
              cj_product_id: pid,
              context: 'details',
              signals: ratingOut.signals,
              displayed_rating: ratingOut.displayedRating,
              rating_confidence: ratingOut.ratingConfidence,
            });
          }
        }
      } catch {}
    } catch {}

    // Build final PricedProduct
    const pricedProduct: PricedProduct = {
      pid,
      cjSku,
      name,
      images,
      minPriceSAR,
      maxPriceSAR,
      avgPriceSAR,
      stock,
      listedNum,
      totalVerifiedInventory: totalVerifiedInventory > 0 ? totalVerifiedInventory : undefined,
      totalUnVerifiedInventory: totalUnVerifiedInventory > 0 ? totalUnVerifiedInventory : undefined,
      inventory: realInventory || undefined,
      inventoryStatus,
      inventoryErrorMessage,
      variants: pricedVariants,
      inventoryVariants: inventoryVariants.length > 0 ? inventoryVariants : undefined,
      successfulVariants,
      totalVariants: pricedVariants.length,
      description,
      overview,
      productInfo,
      sizeInfo,
      productNote,
      packingList,
      displayedRating: rating,
      ratingConfidence: ratingConfidenceVal,
      categoryName,
      productWeight,
      packLength,
      packWidth,
      packHeight,
      material: material || undefined,
      productType,
      sizeChartImages: sizeChartImages.length > 0 ? sizeChartImages : undefined,
      processingTimeHours: processingParsed.hours,
      deliveryTimeHours: deliveryParsed.hours,
      estimatedProcessingDays: processingParsed.display,
      estimatedDeliveryDays: deliveryParsed.display,
      originCountry,
      hsCode,
      videoUrl,
      availableSizes: extractedSizes.length > 0 ? extractedSizes : undefined,
      availableColors: extractedColors.length > 0 ? extractedColors : undefined,
      availableModels: extractedModels.length > 0 ? extractedModels : undefined,
    };

    const duration = Date.now() - startTime;
    console.log(`[ProductDetails] Complete in ${duration}ms`);

    return NextResponse.json({
      ok: true,
      product: pricedProduct,
      duration,
    }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (e: any) {
    console.error('[ProductDetails] Error:', e?.message, e?.stack);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Failed to fetch product details' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

// Image extraction helper (simplified from search-and-price)
function extractAllImages(item: any): string[] {
  const imageList: string[] = [];
  const seenUrls = new Set<string>();

  const pushUrl = (url: any) => {
    if (!url || typeof url !== 'string') return;
    const cleaned = url.trim();
    if (!cleaned.startsWith('http')) return;
    if (seenUrls.has(cleaned)) return;
    seenUrls.add(cleaned);
    imageList.push(cleaned);
  };

  // Direct image fields
  const directFields = ['productImage', 'bigImage', 'productImageSet', 'imageUrl', 'image', 'mainImage', 'whiteImage', 'skuImage'];
  for (const field of directFields) {
    const val = item[field];
    if (typeof val === 'string') {
      if (val.startsWith('[')) {
        try {
          const arr = JSON.parse(val);
          if (Array.isArray(arr)) arr.forEach(u => pushUrl(u));
        } catch {
          pushUrl(val);
        }
      } else {
        pushUrl(val);
      }
    } else if (Array.isArray(val)) {
      val.forEach(u => typeof u === 'string' ? pushUrl(u) : pushUrl(u?.imageUrl || u?.url));
    }
  }

  // Array fields
  const arrFields = ['imageList', 'productImageList', 'detailImageList', 'variantImageList'];
  for (const key of arrFields) {
    const arr = item[key];
    if (Array.isArray(arr)) {
      for (const it of arr) {
        if (typeof it === 'string') pushUrl(it);
        else if (it && typeof it === 'object') {
          pushUrl(it.imageUrl || it.url || it.imgUrl || it.big || it.origin || it.src);
        }
      }
    }
  }

  // Variant images
  const variantList = item.variantList || item.skuList || item.variants || [];
  if (Array.isArray(variantList)) {
    for (const v of variantList) {
      pushUrl(v?.whiteImage);
      pushUrl(v?.image);
      pushUrl(v?.variantImage);
      pushUrl(v?.attributeImage);
    }
  }

  // Filter out badges/icons
  const deny = /(sprite|icon|favicon|logo|placeholder|blank|loading|alipay|wechat|badge|flag|promo|banner|sale|discount|qr)/i;
  return imageList.filter(url => !deny.test(url)).slice(0, 50);
}
