import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminUser } from '@/lib/auth/admin-check';
import { maybeCreateCjOrderForOrderId } from '@/lib/ops/cj-fulfill';

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

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('orderId');

  if (!orderId) {
    const { data: latestOrder } = await supabase
      .from('orders')
      .select('id, status, created_at')
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!latestOrder) {
      return NextResponse.json({ error: 'No paid orders found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Add ?orderId=X to test CJ fulfillment',
      latest_paid_order: latestOrder,
      test_url: `/api/admin/debug/cj-test?orderId=${latestOrder.id}`,
    });
  }

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', parseInt(orderId))
    .single();

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const { data: orderItems } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', parseInt(orderId));

  const productIds = (orderItems || []).map((i: any) => i.product_id).filter(Boolean);
  
  let products: any[] = [];
  let productVariants: any[] = [];

  if (productIds.length > 0) {
    const { data: p } = await supabase
      .from('products')
      .select('id, title, cj_product_id')
      .in('id', productIds);
    products = p || [];

    const { data: v } = await supabase
      .from('product_variants')
      .select('id, product_id, option_name, option_value, cj_variant_id, cj_sku')
      .in('product_id', productIds);
    productVariants = v || [];
  }

  const shippingInfo = {
    name: order.shipping_name || 'Test User',
    phone: order.shipping_phone || '+1234567890',
    address1: order.shipping_address1 || '123 Test St',
    address2: order.shipping_address2 || '',
    city: order.shipping_city || 'New York',
    state: order.shipping_state || 'NY',
    postalCode: order.shipping_postal_code || '10001',
    country: order.shipping_country || 'US',
  };

  const result = await maybeCreateCjOrderForOrderId(parseInt(orderId), shippingInfo);

  return NextResponse.json({
    order_id: orderId,
    order_status: order.status,
    order_items: orderItems,
    products,
    product_variants: productVariants,
    shipping_info_used: shippingInfo,
    cj_result: result,
    cj_configured: !!(process.env.CJ_EMAIL && process.env.CJ_API_KEY),
  });
}
