import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getProductVariants, type CJVariant } from '@/lib/cj/product-discovery';
import { calculateKSAPrice } from '@/lib/cj/ksa-pricing';
import { ensureAdmin } from '@/lib/auth/admin-guard';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface QueuedProduct {
  id: number;
  batch_id: string;
  cj_product_id: string;
  cj_sku: string;
  name_en: string;
  image_url: string;
  cj_price_usd: number;
  shipping_usd: number;
  shipping_days: string;
  final_price_sar: number;
  profit_sar: number;
  margin_percent: number;
  stock: number;
  category_path: string;
  pricing_breakdown: Record<string, unknown>;
  status: string;
}

interface ImportResult {
  cjProductId: string;
  productId?: number;
  success: boolean;
  skipped?: boolean;
  error?: string;
  variantsCreated?: number;
}

function generateSlug(name: string, cjProductId: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
  
  const suffix = cjProductId.slice(-6).toLowerCase();
  return `${base}-${suffix}`;
}

function generateSKU(cjSku: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const cjPart = cjSku.slice(-8).toUpperCase();
  return `SX-${cjPart}-${timestamp}`;
}

function mapCategoryPath(categoryPath: string): string {
  const path = categoryPath.toLowerCase();
  
  const categoryMap: Record<string, string> = {
    'women': 'womens-fashion',
    'men': 'mens-fashion',
    'clothing': 'fashion',
    'jewelry': 'accessories',
    'watches': 'accessories',
    'bags': 'bags',
    'home': 'home-living',
    'garden': 'home-living',
    'beauty': 'beauty',
    'health': 'health-wellness',
    'electronics': 'electronics',
    'sports': 'sports',
    'toys': 'toys-games',
    'kids': 'kids',
    'baby': 'kids',
  };

  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (path.includes(keyword)) {
      return category;
    }
  }
  
  return 'general';
}

async function importProduct(
  product: QueuedProduct
): Promise<ImportResult> {
  const result: ImportResult = {
    cjProductId: product.cj_product_id,
    success: false,
  };

  try {
    let variants: CJVariant[] = [];
    try {
      variants = await getProductVariants(product.cj_product_id);
    } catch {
      console.log(`No variants found for ${product.cj_product_id}, using stock only`);
    }

    const slug = generateSlug(product.name_en, product.cj_product_id);
    const sku = generateSKU(product.cj_sku);
    const category = mapCategoryPath(product.category_path);

    const uiVariants: { name: string; options: string[] }[] = [];
    if (variants.length > 0) {
      const sizeOptions = new Set<string>();
      const colorOptions = new Set<string>();
      
      for (const v of variants) {
        if (v.variantSku?.includes('Size')) {
          sizeOptions.add(v.variantNameEn || v.variantSku);
        }
        if (v.variantNameEn) {
          const name = v.variantNameEn.toLowerCase();
          if (name.includes('s') || name.includes('m') || name.includes('l') || name.includes('xl')) {
            sizeOptions.add(v.variantNameEn);
          } else {
            colorOptions.add(v.variantNameEn);
          }
        }
      }
      
      if (sizeOptions.size > 0) {
        uiVariants.push({ name: 'Size', options: Array.from(sizeOptions) });
      }
      if (colorOptions.size > 0) {
        uiVariants.push({ name: 'Color', options: Array.from(colorOptions) });
      }
    }

    const totalStock = variants.length > 0 
      ? variants.reduce((sum, v) => sum + (v.variantStock || 0), 0)
      : product.stock;

    const productVariants = variants.map(v => {
      const variantPriceUSD = v.variantSellPrice || product.cj_price_usd;
      const variantPricing = calculateKSAPrice({
        cjPriceUSD: variantPriceUSD,
        shippingUSD: product.shipping_usd,
        marginPercent: product.margin_percent,
      });
      
      return {
        option_name: 'Variant',
        option_value: v.variantNameEn || v.variantSku || 'Default',
        cj_sku: v.variantSku || null,
        cj_variant_id: v.vid || null,
        price: variantPricing.roundedPriceSAR,
        stock: v.variantStock || 0,
      };
    });

    const { data: rpcResult, error: rpcError } = await supabase.rpc('import_cj_product', {
      p_title: product.name_en,
      p_slug: slug,
      p_description: `Imported from CJ Dropshipping. SKU: ${sku}`,
      p_price: product.final_price_sar,
      p_images: product.image_url ? [product.image_url] : [],
      p_category: category,
      p_stock: totalStock,
      p_variants: uiVariants,
      p_cj_product_id: product.cj_product_id,
      p_shipping_from: 'China',
      p_delivery_time_hours: parseInt(product.shipping_days.split('-')[1] || '15') * 24,
      p_product_variants: productVariants,
      p_batch_id: product.batch_id,
      p_queue_item_id: product.id,
      p_import_details: {
        finalPrice: product.final_price_sar,
        category,
        marginPercent: product.margin_percent,
      },
    });

    if (rpcError) {
      result.error = rpcError.message;
      return result;
    }

    const rpcData = rpcResult as { 
      success: boolean; 
      skipped?: boolean; 
      productId?: number; 
      variantsCreated?: number;
      error?: string;
      message?: string;
    };

    if (rpcData.skipped) {
      result.success = false;
      result.skipped = true;
      result.productId = rpcData.productId;
      return result;
    }

    if (!rpcData.success) {
      result.error = rpcData.error || 'Import failed';
      return result;
    }

    result.success = true;
    result.productId = rpcData.productId;
    result.variantsCreated = rpcData.variantsCreated;
    
    return result;

  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Import failed';
    
    try {
      await supabase.from('import_logs').insert({
        batch_id: product.batch_id,
        queue_item_id: product.id,
        cj_product_id: product.cj_product_id,
        action: 'import',
        status: 'error',
        details: { error: result.error },
      });
    } catch {
      console.error('Failed to log import error');
    }

    return result;
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await ensureAdmin();
    if (!adminCheck.ok) {
      return NextResponse.json(
        { ok: false, error: adminCheck.reason || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productIds, importAll } = body as {
      productIds?: number[];
      importAll?: boolean;
    };

    let query = supabase
      .from('product_queue')
      .select('*')
      .eq('status', 'approved');

    if (!importAll && productIds && productIds.length > 0) {
      query = query.in('id', productIds);
    }

    const { data: approvedProducts, error: fetchError } = await query;

    if (fetchError) throw fetchError;
    if (!approvedProducts || approvedProducts.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No approved products to import',
        results: [],
      });
    }

    const results: ImportResult[] = [];
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const product of approvedProducts) {
      const result = await importProduct(product as QueuedProduct);
      results.push(result);
      
      if (result.skipped) {
        skippedCount++;
      } else if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Import complete: ${successCount} imported, ${skippedCount} duplicates skipped, ${errorCount} errors`,
      stats: {
        total: approvedProducts.length,
        success: successCount,
        duplicates: skippedCount,
        errors: errorCount,
      },
      results,
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const adminCheck = await ensureAdmin();
    if (!adminCheck.ok) {
      return NextResponse.json(
        { ok: false, error: adminCheck.reason || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: logs, error } = await supabase
      .from('import_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const { count: totalImported } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .not('cj_product_id', 'is', null);

    return NextResponse.json({
      ok: true,
      recentLogs: logs || [],
      totalImportedProducts: totalImported || 0,
    });
  } catch (error) {
    console.error('Import logs error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
