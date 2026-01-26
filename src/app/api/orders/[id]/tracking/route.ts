import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CjApi } from '@/lib/cj/api';

export const runtime = 'nodejs';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const orderId = params.id;
    const isNumeric = /^\d+$/.test(orderId);
    
    let query = supabase
      .from('orders')
      .select(`
        id, order_number, status, shipping_status,
        cj_order_no, cj_tracking_number, cj_carrier, cj_order_status,
        shipped_at, delivered_at, created_at
      `);
    
    if (isNumeric) {
      query = query.eq('id', parseInt(orderId));
    } else {
      query = query.eq('order_number', orderId);
    }
    
    const { data: order, error } = await query.single();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const timeline = [
      {
        status: 'ordered',
        label: 'Order Placed',
        timestamp: order.created_at,
        completed: true,
      },
      {
        status: 'paid',
        label: 'Payment Confirmed',
        timestamp: order.status !== 'pending' ? order.created_at : null,
        completed: ['paid', 'processing', 'shipped', 'delivered'].includes(order.status),
      },
      {
        status: 'processing',
        label: 'Processing',
        timestamp: order.cj_order_no ? order.created_at : null,
        completed: ['processing', 'shipped', 'delivered'].includes(order.status),
      },
      {
        status: 'shipped',
        label: 'Shipped',
        timestamp: order.shipped_at,
        completed: ['shipped', 'delivered'].includes(order.status),
      },
      {
        status: 'delivered',
        label: 'Delivered',
        timestamp: order.delivered_at,
        completed: order.status === 'delivered',
      },
    ];

    return NextResponse.json({
      ok: true,
      tracking: {
        orderNumber: order.order_number,
        status: order.status,
        shippingStatus: order.shipping_status,
        cjOrderNo: order.cj_order_no,
        trackingNumber: order.cj_tracking_number,
        carrier: order.cj_carrier,
        timeline,
      },
    });

  } catch (e: any) {
    console.error('[Tracking API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to fetch tracking' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const orderId = parseInt(params.id);
    if (!orderId || isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

<<<<<<< HEAD
=======
    type OrderWithTracking = {
      id: number;
      cj_order_no: string | null;
      cj_tracking_number: string | null;
      shipping_status: string | null;
    };
    
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, cj_order_no, cj_tracking_number, shipping_status')
      .eq('id', orderId)
<<<<<<< HEAD
      .single();
=======
      .single<OrderWithTracking>();
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!order.cj_order_no) {
      return NextResponse.json({ 
        ok: false, 
        reason: 'No CJ order associated with this order yet' 
      }, { status: 400 });
    }

    const cj = new CjApi();
    if (!cj.isConfigured()) {
      return NextResponse.json({
        ok: false,
        reason: 'CJ API not configured',
        cjOrderNo: order.cj_order_no,
      }, { status: 501 });
    }

    try {
      const orderDetail = await cj.getOrderDetail(order.cj_order_no);
      const data = orderDetail?.data || orderDetail;
      
      if (data) {
        const updates: Record<string, any> = {
          cj_last_sync: new Date().toISOString(),
        };
        
        const trackNumber = data.trackNumber || data.trackingNumber || data.tracking_number;
        if (trackNumber && trackNumber !== order.cj_tracking_number) {
          updates.cj_tracking_number = trackNumber;
        }
        const carrier = data.logisticName || data.carrier || data.shipping_carrier;
        if (carrier) {
          updates.cj_carrier = carrier;
        }
        const cjStatus = data.orderStatus || data.status;
        if (cjStatus) {
          updates.cj_order_status = cjStatus;
          
          if (['SHIPPED', 'IN_TRANSIT', 'DISPATCHED'].includes(cjStatus) && order.shipping_status !== 'shipped') {
            updates.shipping_status = 'shipped';
            updates.shipped_at = new Date().toISOString();
          }
          if (['DELIVERED', 'COMPLETED'].includes(cjStatus) && order.shipping_status !== 'delivered') {
            updates.shipping_status = 'delivered';
            updates.status = 'delivered';
            updates.delivered_at = new Date().toISOString();
          }
        }

        if (Object.keys(updates).length > 1) {
          await supabase
            .from('orders')
            .update(updates)
            .eq('id', orderId);
        }

        return NextResponse.json({
          ok: true,
          synced: true,
          trackingNumber: updates.cj_tracking_number || order.cj_tracking_number,
          carrier: updates.cj_carrier,
          cjStatus: cjStatus,
        });
      }

      return NextResponse.json({
        ok: true,
        synced: false,
        message: 'CJ order found but no tracking update available',
        cjOrderNo: order.cj_order_no,
      });

    } catch (cjError: any) {
      console.error('[Tracking Sync] CJ API error:', cjError);
      return NextResponse.json({
        ok: false,
        reason: 'CJ API call failed',
        error: cjError?.message,
      }, { status: 502 });
    }

  } catch (e: any) {
    console.error('[Tracking Sync] Error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to sync tracking' }, { status: 500 });
  }
}
