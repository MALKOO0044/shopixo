import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
      .select('*');
    
    if (isNumeric) {
      query = query.eq('id', parseInt(orderId));
    } else {
      query = query.eq('order_number', orderId);
    }
    
    const { data: order, error: orderErr } = await query.single();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { data: items, error: itemsErr } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);

    if (itemsErr) {
      console.error('[Order Details] Failed to fetch items:', itemsErr);
    }

    return NextResponse.json({
      ok: true,
      order: {
        ...order,
        items: items || [],
      },
    });

  } catch (e: any) {
    console.error('[Order Details] Error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to fetch order' }, { status: 500 });
  }
}
