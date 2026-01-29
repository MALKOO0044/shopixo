import { NextRequest, NextResponse } from 'next/server';
import { fetchProductDetailsBatch } from '@/lib/cj/v2';
import { ensureAdmin } from '@/lib/auth/admin-guard';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Server configuration error: missing Supabase env vars');
  }
  return createClient(url, key);
}

type ColorImageMap = Record<string, string>;

function extractColorImageMap(source: any): ColorImageMap {
  const colorImageMap: ColorImageMap = {};
  
  const colorPropertyList = source.productPropertyList || source.propertyList || source.productOptions || [];
  if (!Array.isArray(colorPropertyList)) return colorImageMap;
  
  for (const prop of colorPropertyList) {
    const propName = String(prop.propertyNameEn || prop.propertyName || prop.name || '').toLowerCase();
    
    if (propName.includes('color') || propName.includes('colour')) {
      const valueList = prop.propertyValueList || prop.values || prop.options || [];
      if (Array.isArray(valueList)) {
        for (const pv of valueList) {
          const colorValue = String(pv.propertyValueNameEn || pv.propertyValueName || pv.value || pv.name || '').trim();
          const cleanColor = colorValue.replace(/[\u4e00-\u9fff]/g, '').trim();
          const colorImg = pv.image || pv.imageUrl || pv.propImage || pv.bigImage || pv.pic || '';
          
          if (cleanColor && cleanColor.length > 0 && cleanColor.length < 50 && /[a-zA-Z]/.test(cleanColor)) {
            if (typeof colorImg === 'string' && colorImg.startsWith('http')) {
              colorImageMap[cleanColor] = colorImg;
            }
          }
        }
      }
    }
  }
  
  return colorImageMap;
}

function normalizeColorForMatching(color: string): string {
  return color.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findMatchingColorImage(variantColor: string, colorImageMap: ColorImageMap): string | null {
  if (!variantColor || Object.keys(colorImageMap).length === 0) return null;
  
  const normalizedVariantColor = normalizeColorForMatching(variantColor);
  
  for (const [mapColor, imageUrl] of Object.entries(colorImageMap)) {
    const normalizedMapColor = normalizeColorForMatching(mapColor);
    if (normalizedVariantColor === normalizedMapColor) {
      return imageUrl;
    }
    if (normalizedVariantColor.includes(normalizedMapColor) || normalizedMapColor.includes(normalizedVariantColor)) {
      return imageUrl;
    }
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  const adminResult = await ensureAdmin();
  if (!adminResult.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  try {
    const body = await request.json();
    const { productIds, all } = body;

    let productsToUpdate: { id: number; cj_product_id: string }[] = [];

    if (all) {
      const { data: products, error } = await supabaseAdmin
        .from('products')
        .select('id, cj_product_id')
        .not('cj_product_id', 'is', null)
        .limit(100);
      
      if (error) throw error;
      productsToUpdate = (products || []).filter(p => p.cj_product_id);
    } else if (Array.isArray(productIds) && productIds.length > 0) {
      const { data: products, error } = await supabaseAdmin
        .from('products')
        .select('id, cj_product_id')
        .in('id', productIds)
        .not('cj_product_id', 'is', null);
      
      if (error) throw error;
      productsToUpdate = (products || []).filter(p => p.cj_product_id);
    } else {
      return NextResponse.json({ error: 'Provide productIds array or set all: true' }, { status: 400 });
    }

    if (productsToUpdate.length === 0) {
      return NextResponse.json({ message: 'No products with CJ product IDs found', updated: 0 });
    }

    const results: { productId: number; cjPid: string; colorsUpdated: number; error?: string }[] = [];

    for (const product of productsToUpdate) {
      try {
        const detailMap = await fetchProductDetailsBatch([product.cj_product_id]);
        const detail = detailMap.get(product.cj_product_id);
        
        if (!detail) {
          results.push({ productId: product.id, cjPid: product.cj_product_id, colorsUpdated: 0, error: 'Product not found in CJ API' });
          continue;
        }

        const colorImageMap = extractColorImageMap(detail);
        
        if (Object.keys(colorImageMap).length === 0) {
          results.push({ productId: product.id, cjPid: product.cj_product_id, colorsUpdated: 0, error: 'No color images found in CJ data' });
          continue;
        }

        console.log(`[Resync Media] Product ${product.id} (CJ: ${product.cj_product_id}): Found colorImageMap with ${Object.keys(colorImageMap).length} colors`);

        const { data: variants, error: varError } = await supabaseAdmin
          .from('product_variants')
          .select('id, option_name, option_value, image_url')
          .eq('product_id', product.id);

        if (varError) throw varError;

        let updatedCount = 0;
        for (const variant of variants || []) {
          const optionName = (variant.option_name || '').toLowerCase();
          if (!optionName.includes('color')) continue;

          const variantColor = variant.option_value;
          const matchedImageUrl = findMatchingColorImage(variantColor, colorImageMap);

          if (matchedImageUrl && matchedImageUrl !== variant.image_url) {
            const { error: updateError } = await supabaseAdmin
              .from('product_variants')
              .update({ image_url: matchedImageUrl })
              .eq('id', variant.id);

            if (!updateError) {
              updatedCount++;
              console.log(`[Resync Media] Updated variant ${variant.id} (${variantColor}) with image: ${matchedImageUrl.substring(0, 50)}...`);
            }
          }
        }

        const { data: availableColors } = await supabaseAdmin
          .from('products')
          .select('available_colors')
          .eq('id', product.id)
          .single();

        if (availableColors?.available_colors && Array.isArray(availableColors.available_colors)) {
          for (const color of availableColors.available_colors) {
            if (!colorImageMap[color]) {
              const matchedUrl = findMatchingColorImage(color, colorImageMap);
              if (matchedUrl) {
                colorImageMap[color] = matchedUrl;
              }
            }
          }
        }

        const { data: existingVariants } = await supabaseAdmin
          .from('products')
          .select('variants')
          .eq('id', product.id)
          .single();

        if (existingVariants?.variants && Array.isArray(existingVariants.variants)) {
          const updatedVariantsJson = existingVariants.variants.map((v: any) => {
            if (v.color) {
              const imageUrl = findMatchingColorImage(v.color, colorImageMap);
              if (imageUrl) {
                return { ...v, image_url: imageUrl };
              }
            }
            return v;
          });

          await supabaseAdmin
            .from('products')
            .update({ variants: updatedVariantsJson })
            .eq('id', product.id);
        }

        results.push({ productId: product.id, cjPid: product.cj_product_id, colorsUpdated: updatedCount });

      } catch (err: any) {
        console.error(`[Resync Media] Error processing product ${product.id}:`, err.message);
        results.push({ productId: product.id, cjPid: product.cj_product_id, colorsUpdated: 0, error: err.message });
      }
    }

    const totalUpdated = results.reduce((sum, r) => sum + r.colorsUpdated, 0);
    const successCount = results.filter(r => !r.error).length;

    return NextResponse.json({
      message: `Processed ${productsToUpdate.length} products, updated ${totalUpdated} variant color images`,
      totalProducts: productsToUpdate.length,
      successfulProducts: successCount,
      totalVariantsUpdated: totalUpdated,
      results
    });

  } catch (error: any) {
    console.error('[Resync Media] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const adminResult = await ensureAdmin();
  if (!adminResult.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data: stats, error } = await supabaseAdmin
    .from('products')
    .select('id, cj_product_id, title')
    .not('cj_product_id', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: variantStats } = await supabaseAdmin
    .from('product_variants')
    .select('id, product_id, option_name, image_url')
    .ilike('option_name', '%color%');

  const totalProducts = stats?.length || 0;
  const colorVariants = variantStats || [];
  const variantsWithImages = colorVariants.filter(v => v.image_url);
  const variantsWithoutImages = colorVariants.filter(v => !v.image_url);

  return NextResponse.json({
    totalProductsWithCjId: totalProducts,
    totalColorVariants: colorVariants.length,
    variantsWithImages: variantsWithImages.length,
    variantsWithoutImages: variantsWithoutImages.length,
    completionPercentage: colorVariants.length > 0 
      ? Math.round((variantsWithImages.length / colorVariants.length) * 100) 
      : 100,
    products: stats?.map(p => ({ id: p.id, title: p.title, cjPid: p.cj_product_id }))
  });
}
