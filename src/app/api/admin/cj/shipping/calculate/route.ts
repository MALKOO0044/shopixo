import { NextRequest, NextResponse } from 'next/server';
import { calculateShippingToSA, calculateFinalPricingSAR, getAccessToken } from '@/lib/cj/v2';
import { fetchJson } from '@/lib/http';
import { logError } from '@/lib/error-logger';

export const dynamic = 'force-dynamic';

const USD_TO_SAR_RATE = 3.75;
const CJ_BASE = process.env.CJ_API_BASE || 'https://developers.cjdropshipping.com/api2.0/v1';

// Look up actual vid from variantSku using variant query API
async function lookupVariantVid(productId: string, variantSku: string): Promise<string | null> {
  try {
    const token = await getAccessToken();
    const response = await fetchJson<any>(`${CJ_BASE}/product/variant/query?pid=${encodeURIComponent(productId)}`, {
      headers: {
        'Content-Type': 'application/json',
        'CJ-Access-Token': token,
      },
      cache: 'no-store',
      timeoutMs: 10000,
    });
    
    if (response?.code !== 200 || !response?.data) {
      console.log(`[Vid Lookup] Failed to get variants for product ${productId}`);
      return null;
    }
    
    const variants = Array.isArray(response.data) ? response.data : (response.data?.list || response.data?.variants || []);
    
    // Normalize the input SKU for comparison (trim + uppercase)
    const normalizedInputSku = variantSku.trim().toUpperCase();
    
    // Find the variant matching our SKU (case-insensitive, trimmed)
    for (const v of variants) {
      const sku = String(v.variantSku || v.sku || '').trim().toUpperCase();
      if (sku === normalizedInputSku) {
        const vid = v.vid || v.variantId || null;
        if (vid) {
          console.log(`[Vid Lookup] Found vid=${vid} for SKU=${variantSku}`);
          return String(vid);
        }
      }
    }
    
    // If no exact match, try first variant with valid vid
    for (const v of variants) {
      const vid = v.vid || v.variantId;
      if (vid) {
        console.log(`[Vid Lookup] No exact SKU match, using first valid variant vid=${vid}`);
        return String(vid);
      }
    }
    
    console.log(`[Vid Lookup] No vid found for product ${productId}, SKU ${variantSku}`);
    return null;
  } catch (e: any) {
    console.error(`[Vid Lookup] Error for ${productId}/${variantSku}:`, e?.message);
    return null;
  }
}

// Per-variant input for accurate pricing
type VariantInput = {
  productId: string;
  variantId: string; // CJ variant ID (vid)
  variantPriceUSD: number; // EXACT price for THIS variant
};

// Per-variant shipping/pricing result
type VariantShippingResult = {
  productId: string;
  variantId: string;
  shipping: {
    available: boolean;
    priceUSD: number;
    priceSAR: number;
    deliveryDays: string;
    logisticName?: string;
    error?: string;
  };
  // pricing is only included when shipping is available (CJPacket Ordinary found)
  // null = shipping unavailable, do not use this variant for pricing
  pricing: {
    variantPriceUSD: number;
    variantPriceSAR: number;
    shippingPriceSAR: number;
    totalCostSAR: number;
    profitSAR: number;
    sellPriceSAR: number;
  } | null;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { variants, profitMarginPercent = 50 } = body as { 
      variants: VariantInput[]; 
      profitMarginPercent: number;
    };
    
    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'variants array is required' },
        { status: 400 }
      );
    }
    
    console.log(`[Shipping API] Starting per-variant shipping calculation for ${variants.length} variants with ${profitMarginPercent}% profit margin`);
    
    // Results keyed by variantId for per-variant accuracy
    const results: Record<string, VariantShippingResult> = {};
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      const { productId, variantId, variantPriceUSD } = variant;
      
      console.log(`[Shipping API] Processing ${i + 1}/${variants.length}: variant ${variantId} (product ${productId})`);
      
      // CRITICAL: Require both variantId AND valid price for accurate pricing
      if (!variantId) {
        console.log(`[Shipping API] Skipping: No variant ID`);
        results[variantId || `unknown_${i}`] = {
          productId,
          variantId: variantId || '',
          shipping: {
            available: false,
            priceUSD: 0,
            priceSAR: 0,
            deliveryDays: '',
            error: 'No variant ID provided'
          },
          pricing: null
        };
        failCount++;
        continue;
      }
      
      if (!variantPriceUSD || variantPriceUSD <= 0) {
        console.log(`[Shipping API] Skipping ${variantId}: Invalid variant price`);
        results[variantId] = {
          productId,
          variantId,
          shipping: {
            available: false,
            priceUSD: 0,
            priceSAR: 0,
            deliveryDays: '',
            error: 'Invalid variant price'
          },
          pricing: null
        };
        failCount++;
        continue;
      }
      
      try {
        // CRITICAL: The variantId we receive might be a SKU, not an actual vid
        // First, try to look up the actual vid from the variant query API
        let actualVid = variantId;
        const normalizedVariantId = variantId.trim().toUpperCase();
        
        // Detect if variantId looks like a valid vid (long numeric or UUID format)
        // Valid vid formats: "1796078021431009280" (19 digits) or "1D72A20A-D113-4FAB-B4BA-6FE1A6A14A3A" (UUID)
        const isValidVidFormat = 
          /^\d{10,}$/.test(normalizedVariantId) || 
          /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(normalizedVariantId);
        
        // If it doesn't look like a valid vid, attempt lookup
        if (!isValidVidFormat && productId) {
          console.log(`[Shipping API] variantId ${variantId} doesn't look like valid vid format, looking up actual vid...`);
          const lookedUpVid = await lookupVariantVid(productId, variantId);
          if (lookedUpVid) {
            actualVid = lookedUpVid;
            console.log(`[Shipping API] Using looked-up vid: ${actualVid}`);
          } else {
            console.log(`[Shipping API] Could not find vid, trying with original: ${variantId}`);
          }
        } else if (isValidVidFormat) {
          console.log(`[Shipping API] variantId ${variantId} looks like valid vid format, using directly`);
        }
        
        const shippingResult = await calculateShippingToSA(actualVid, 1);
        
        if (shippingResult.available && shippingResult.shippingPriceUSD > 0) {
          const pricing = calculateFinalPricingSAR(
            variantPriceUSD, 
            shippingResult.shippingPriceUSD, 
            profitMarginPercent
          );
          
          results[variantId] = {
            productId,
            variantId,
            shipping: {
              available: true,
              priceUSD: shippingResult.shippingPriceUSD,
              priceSAR: shippingResult.shippingPriceSAR,
              deliveryDays: shippingResult.deliveryDays,
              logisticName: shippingResult.logisticName,
            },
            pricing: {
              variantPriceUSD,
              variantPriceSAR: pricing.productPriceSAR,
              shippingPriceSAR: pricing.shippingPriceSAR,
              totalCostSAR: pricing.totalCostSAR,
              profitSAR: pricing.profitSAR,
              sellPriceSAR: pricing.sellPriceSAR,
            }
          };
          successCount++;
          console.log(`[Shipping API] Success for variant ${variantId}: $${shippingResult.shippingPriceUSD} shipping, ${pricing.sellPriceSAR.toFixed(2)} SAR sell price`);
        } else {
          results[variantId] = {
            productId,
            variantId,
            shipping: {
              available: false,
              priceUSD: 0,
              priceSAR: 0,
              deliveryDays: '',
              error: shippingResult.error || 'CJPacket Ordinary not available'
            },
            pricing: null
          };
          failCount++;
          console.log(`[Shipping API] Unavailable for variant ${variantId}: ${shippingResult.error}`);
        }
        
      } catch (error: any) {
        console.error(`[Shipping API] Error for variant ${variantId}:`, error?.message);
        results[variantId] = {
          productId,
          variantId,
          shipping: {
            available: false,
            priceUSD: 0,
            priceSAR: 0,
            deliveryDays: '',
            error: error?.message || 'Failed to calculate shipping'
          },
          pricing: null
        };
        failCount++;
      }
      
      // Rate limiting - wait 1.2 seconds between CJ API calls
      if (i < variants.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
    }
    
    console.log(`[Shipping API] Completed: ${successCount} success, ${failCount} failed out of ${variants.length} variants`);
    
    return NextResponse.json({ 
      ok: true, 
      results,
      stats: {
        total: variants.length,
        success: successCount,
        failed: failCount
      }
    });
    
  } catch (error: any) {
    console.error('[Shipping API] Fatal error:', error?.message);
    
    await logError({
      error_type: 'shipping',
      message: error?.message || 'Failed to calculate shipping',
      details: {
        stack: error?.stack,
      },
      page: '/api/admin/cj/shipping/calculate',
    });
    
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to calculate shipping' },
      { status: 500 }
    );
  }
}
