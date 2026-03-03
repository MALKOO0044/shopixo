import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const orderNumber = searchParams.get('orderNumber');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        payment_status,
        shipping_status,
        subtotal,
        shipping_cost,
        tax,
        total_amount,
        currency,
        customer_name,
        customer_email,
        shipping_city,
        shipping_state,
        shipping_country,
        cj_order_no,
        cj_tracking_number,
        cj_carrier,
        paid_at,
        shipped_at,
        delivered_at,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (orderNumber) {
      query = query.eq('order_number', orderNumber);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('[Orders API] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, orders: orders || [] });

  } catch (e: any) {
    console.error('[Orders API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { 
      userId, 
      items, 
      shippingAddress, 
      subtotal, 
      shippingCost = 0, 
      tax = 0, 
      totalAmount,
      customerEmail,
      customerName
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Order items required' }, { status: 400 });
    }

    const orderNumber = `SX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        user_id: userId || null,
        order_number: orderNumber,
        status: 'pending',
        payment_status: 'pending',
        shipping_status: 'pending',
        subtotal: subtotal || items.reduce((sum: number, i: any) => sum + (i.totalPrice || 0), 0),
        shipping_cost: shippingCost,
        tax: tax,
        total_amount: totalAmount || (subtotal || 0) + shippingCost + tax,
        currency: 'USD',
        customer_email: customerEmail || null,
        customer_name: customerName || shippingAddress?.name || null,
        shipping_name: shippingAddress?.name || null,
        shipping_phone: shippingAddress?.phone || null,
        shipping_address1: shippingAddress?.address1 || null,
        shipping_address2: shippingAddress?.address2 || null,
        shipping_city: shippingAddress?.city || null,
        shipping_state: shippingAddress?.state || null,
        shipping_postal_code: shippingAddress?.postalCode || null,
        shipping_country: shippingAddress?.country || 'US',
      })
      .select('id, order_number')
      .single();

    if (orderErr || !order) {
      console.error('[Orders API] Create error:', orderErr);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.productId,
      variant_id: item.variantId || null,
      product_title: item.title || null,
      product_image: item.image || null,
      variant_name: item.variantName || null,
      cj_product_id: item.cjProductId || null,
      cj_sku: item.cjSku || null,
      cj_variant_id: item.cjVariantId || null,
      quantity: item.quantity || 1,
      unit_price: item.unitPrice || item.price || 0,
      total_price: item.totalPrice || (item.unitPrice || item.price || 0) * (item.quantity || 1),
    }));

    await supabase.from('order_items').insert(orderItems);

    return NextResponse.json({ ok: true, order });

  } catch (e: any) {
    console.error('[Orders API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to create order' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { orderId, status, shippingStatus, trackingNumber, carrier } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (status) updates.status = status;
    if (shippingStatus) updates.shipping_status = shippingStatus;
    if (trackingNumber) updates.cj_tracking_number = trackingNumber;
    if (carrier) updates.cj_carrier = carrier;

    if (status === 'shipped' || shippingStatus === 'shipped') {
      updates.shipped_at = new Date().toISOString();
    }
    if (status === 'delivered' || shippingStatus === 'delivered') {
      updates.delivered_at = new Date().toISOString();
    }

    const { data: order, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select('id, order_number, status, shipping_status')
      .single();

    if (error) {
      console.error('[Orders API] Update error:', error);
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, order });

  } catch (e: any) {
    console.error('[Orders API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to update order' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
    }

    const { data: order, error: checkErr } = await supabase
      .from('orders')
      .select('id, status, cj_order_no')
      .eq('id', parseInt(orderId))
      .single();

    if (checkErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.cj_order_no) {
      return NextResponse.json({ 
        error: 'Cannot delete order with CJ fulfillment. Cancel the CJ order first.' 
      }, { status: 400 });
    }

    if (['paid', 'processing', 'shipped', 'delivered'].includes(order.status)) {
      return NextResponse.json({ 
        error: 'Cannot delete orders that have been paid or processed' 
      }, { status: 400 });
    }

    await supabase.from('order_items').delete().eq('order_id', order.id);
    const { error: deleteErr } = await supabase.from('orders').delete().eq('id', order.id);

    if (deleteErr) {
      console.error('[Orders API] Delete error:', deleteErr);
      return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Order deleted' });

  } catch (e: any) {
    console.error('[Orders API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to delete order' }, { status: 500 });
  }
}
