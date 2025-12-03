import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/cj/v2';
import { ensureAdmin } from '@/lib/auth/admin-guard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CJ_BASE = process.env.CJ_API_BASE || 'https://developers.cjdropshipping.com/api2.0/v1';

export async function GET(req: NextRequest) {
  const auth = await ensureAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pid = req.nextUrl.searchParams.get('pid');
  
  if (!pid) {
    return NextResponse.json({ error: 'Missing pid parameter' }, { status: 400 });
  }

  try {
    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json({ error: 'Failed to get CJ access token' }, { status: 500 });
    }

    // Use /product/query instead of /product/variant/query
    // /variant/query ONLY works for "My Products", /product/query works for ALL products
    const url = `${CJ_BASE}/product/query?pid=${encodeURIComponent(pid)}`;
    
    console.log(`[Test Variant] Fetching variants for pid=${pid}`);
    console.log(`[Test Variant] URL: ${url}`);
    
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'CJ-Access-Token': token,
      },
      cache: 'no-store',
    });
    
    const response = await res.json();
    
    console.log(`[Test Variant] Response:`, JSON.stringify(response, null, 2));
    
    // Extract variants from product/query response
    const productData = response?.data;
    let variants: any[] = [];
    
    if (productData) {
      if (Array.isArray(productData.variants)) {
        variants = productData.variants;
      } else if (Array.isArray(productData.variantList)) {
        variants = productData.variantList;
      } else if (Array.isArray(productData.skuList)) {
        variants = productData.skuList;
      }
    }
    
    return NextResponse.json({
      pid,
      url,
      response,
      analysis: {
        code: response?.code,
        result: response?.result,
        message: response?.message,
        productDataKeys: productData ? Object.keys(productData) : [],
        variantsFound: variants.length,
        firstVariant: variants[0] ? {
          vid: variants[0].vid,
          variantId: variants[0].variantId,
          variantSku: variants[0].variantSku,
          variantSellPrice: variants[0].variantSellPrice,
          allKeys: Object.keys(variants[0]),
        } : null,
        productLevelVid: productData?.vid || productData?.variantId || productData?.defaultVid || null,
      },
    });
  } catch (err: any) {
    console.error(`[Test Variant] Error:`, err);
    return NextResponse.json({ 
      error: err?.message,
      stack: err?.stack 
    }, { status: 500 });
  }
}
