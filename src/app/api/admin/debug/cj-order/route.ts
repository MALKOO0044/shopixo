import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminUser } from '@/lib/auth/admin-check';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  let orders: any[] | null = null;
  
  const { data: fullOrders, error: fullErr } = await supabase
    .from('orders')
    .select('id, order_number, status, created_at, shipping_name, shipping_address1, shipping_city, cj_order_no')
    .order('created_at', { ascending: false })
    .limit(5);

  if (fullErr) {
    const { data: minOrders, error: minErr } = await supabase
      .from('orders')
      .select('id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (minErr) {
      return NextResponse.json({ error: minErr.message }, { status: 500 });
    }
    orders = minOrders;
  } else {
    orders = fullOrders;
  }

  const results = [];

  for (const order of orders || []) {
    const { data: items, error: itemsErr } = await supabase
      .from('order_items')
      .select('id, product_id, variant_id, cj_variant_id, cj_product_id, cj_sku, product_title, quantity')
      .eq('order_id', order.id);

    const productIds = (items || []).map((i: any) => i.product_id).filter(Boolean);
    const variantIds = (items || []).map((i: any) => i.variant_id).filter(Boolean);

    let products: any[] = [];
    let variants: any[] = [];

    if (productIds.length > 0) {
      const { data } = await supabase
        .from('products')
        .select('id, title, cj_product_id')
        .in('id', productIds);
      products = data || [];
    }

    if (variantIds.length > 0) {
      const { data } = await supabase
        .from('product_variants')
        .select('id, option_name, option_value, cj_variant_id, cj_sku')
        .in('id', variantIds);
      variants = data || [];
    }

    if (productIds.length > 0) {
      const { data: productVariants } = await supabase
        .from('product_variants')
        .select('id, product_id, option_name, option_value, cj_variant_id, cj_sku')
        .in('product_id', productIds)
        .limit(5);
      if (productVariants && productVariants.length > 0) {
        variants = productVariants;
      }
    }

    results.push({
      order: {
        id: order.id,
        order_number: order.order_number || null,
        status: order.status,
        created_at: order.created_at,
        has_shipping: !!(order.shipping_name && order.shipping_address1 && order.shipping_city),
        shipping_name: order.shipping_name || null,
        shipping_city: order.shipping_city || null,
        cj_order_no: order.cj_order_no || null,
      },
      items: items || [],
      products,
      variants,
      issues: (items || []).map((item: any) => {
        const issues = [];
        if (!item.cj_variant_id) issues.push('Missing cj_variant_id in order_items');
        if (!item.cj_product_id) issues.push('Missing cj_product_id in order_items');
        if (!item.variant_id) issues.push('No variant_id (user may not have selected size)');
        const variant = variants.find((v: any) => v.id === item.variant_id);
        if (item.variant_id && !variant) issues.push('Variant not found in product_variants');
        if (variant && !variant.cj_variant_id) issues.push('Variant exists but has no cj_variant_id in product_variants');
        return { product_id: item.product_id, issues };
      }),
    });
  }

  return NextResponse.json({
    ok: true,
    cj_configured: !!(process.env.CJ_EMAIL && process.env.CJ_API_KEY),
    orders: results,
    note: 'If items is empty, the order_items insert is failing. Production DB may be missing columns like variant_id, cj_variant_id, cj_product_id, cj_sku, product_title. Check Supabase for the schema.',
  });
}
