import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateKSAPrice, getUsdToSarRate, VAT_RATE, PAYMENT_FEE_RATE } from '@/lib/cj/ksa-pricing';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface QueuedProduct {
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
  status: 'pending' | 'approved' | 'rejected' | 'imported' | 'skipped';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('includeAll') === 'true';
    
    const { data: batches, error: batchError } = await supabase
      .from('import_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (batchError) throw batchError;

    let query = supabase
      .from('product_queue')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!includeAll) {
      query = query.in('status', ['pending', 'approved', 'rejected', 'skipped']);
    }
    
    const { data: queuedProducts, error: queueError } = await query;

    if (queueError) throw queueError;

    const stats = {
      pending: queuedProducts?.filter(p => p.status === 'pending').length || 0,
      approved: queuedProducts?.filter(p => p.status === 'approved').length || 0,
      rejected: queuedProducts?.filter(p => p.status === 'rejected').length || 0,
      imported: queuedProducts?.filter(p => p.status === 'imported').length || 0,
      skipped: queuedProducts?.filter(p => p.status === 'skipped').length || 0,
      total: queuedProducts?.length || 0,
    };

    return NextResponse.json({
      ok: true,
      batches: batches || [],
      products: queuedProducts || [],
      stats,
    });
  } catch (error) {
    console.error('Queue fetch error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to fetch queue' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { products, batchName } = body as { 
      products: Array<{
        id: string;
        sku: string;
        nameEn: string;
        bigImage: string;
        sellPrice: string;
        discountPrice?: string;
        warehouseInventoryNum: number;
        threeCategoryName?: string;
        twoCategoryName?: string;
        oneCategoryName?: string;
        shippingUSD: number;
        shippingDays: string;
        pricing: {
          baseCostSAR: number;
          vatSAR: number;
          paymentFeeSAR: number;
          profitSAR: number;
          roundedPriceSAR: number;
          actualMarginPercent: number;
          breakdown: Record<string, unknown>;
        };
      }>;
      batchName?: string;
    };

    if (!products || products.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No products provided' },
        { status: 400 }
      );
    }

    const { data: batch, error: batchError } = await supabase
      .from('import_batches')
      .insert({
        name: batchName || `Import ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
        total_products: products.length,
        status: 'pending',
        search_params: {},
      })
      .select()
      .single();

    if (batchError) throw batchError;

    const queueItems: QueuedProduct[] = products.map(product => {
      const cjPrice = parseFloat(product.discountPrice || product.sellPrice) || 0;
      const categoryPath = [
        product.oneCategoryName,
        product.twoCategoryName,
        product.threeCategoryName,
      ].filter(Boolean).join(' > ');

      return {
        cj_product_id: product.id,
        cj_sku: product.sku,
        name_en: product.nameEn,
        image_url: product.bigImage,
        cj_price_usd: cjPrice,
        shipping_usd: product.shippingUSD,
        shipping_days: product.shippingDays,
        final_price_sar: product.pricing.roundedPriceSAR,
        profit_sar: product.pricing.profitSAR,
        margin_percent: product.pricing.actualMarginPercent,
        stock: product.warehouseInventoryNum,
        category_path: categoryPath,
        pricing_breakdown: product.pricing.breakdown,
        status: 'pending',
      };
    });

    const { error: queueError } = await supabase
      .from('product_queue')
      .insert(queueItems.map(item => ({
        ...item,
        batch_id: batch.id,
      })));

    if (queueError) throw queueError;

    return NextResponse.json({
      ok: true,
      batchId: batch.id,
      batchName: batch.name,
      addedCount: products.length,
    });
  } catch (error) {
    console.error('Queue add error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to add to queue' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { productIds, action, newPriceSAR } = body as {
      productIds: number[];
      action: 'approve' | 'reject' | 'restore' | 'update_price';
      newPriceSAR?: number;
    };

    if (!productIds || productIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No product IDs provided' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'approve': {
        const { error } = await supabase
          .from('product_queue')
          .update({ status: 'approved' })
          .in('id', productIds);
        if (error) throw error;
        break;
      }
      
      case 'reject': {
        const { error } = await supabase
          .from('product_queue')
          .update({ status: 'rejected' })
          .in('id', productIds);
        if (error) throw error;
        break;
      }
      
      case 'restore': {
        const { error } = await supabase
          .from('product_queue')
          .update({ status: 'pending' })
          .in('id', productIds);
        if (error) throw error;
        break;
      }
      
      case 'update_price': {
        if (typeof newPriceSAR !== 'number' || isNaN(newPriceSAR) || newPriceSAR <= 0) {
          return NextResponse.json(
            { ok: false, error: 'Invalid price: must be a positive number' },
            { status: 400 }
          );
        }

        const { data: products, error: fetchError } = await supabase
          .from('product_queue')
          .select('id, cj_price_usd, shipping_usd')
          .in('id', productIds);

        if (fetchError) throw fetchError;
        if (!products || products.length === 0) {
          return NextResponse.json(
            { ok: false, error: 'Products not found' },
            { status: 404 }
          );
        }

        const usdToSar = getUsdToSarRate();
        
        for (const product of products) {
          const baseCostUSD = product.cj_price_usd + product.shipping_usd;
          const baseCostSAR = baseCostUSD * usdToSar;
          const costWithVAT = baseCostSAR * (1 + VAT_RATE);
          const costWithFees = costWithVAT * (1 + PAYMENT_FEE_RATE);
          
          const profitSAR = newPriceSAR - costWithFees;
          const marginPercent = (profitSAR / baseCostSAR) * 100;

          const { error: updateError } = await supabase
            .from('product_queue')
            .update({
              final_price_sar: newPriceSAR,
              profit_sar: profitSAR,
              margin_percent: marginPercent,
            })
            .eq('id', product.id);

          if (updateError) throw updateError;
        }
        break;
      }
      
      default:
        return NextResponse.json(
          { ok: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      ok: true,
      updatedCount: productIds.length,
      action,
    });
  } catch (error) {
    console.error('Queue update error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to update queue' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productIds = searchParams.get('ids')?.split(',').map(Number).filter(n => !isNaN(n));

    if (!productIds || productIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No product IDs provided' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('product_queue')
      .delete()
      .in('id', productIds);

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      deletedCount: productIds.length,
    });
  } catch (error) {
    console.error('Queue delete error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to delete from queue' },
      { status: 500 }
    );
  }
}
