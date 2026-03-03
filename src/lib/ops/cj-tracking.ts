import { createClient } from '@supabase/supabase-js';
import { CjApi } from '@/lib/cj/api';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function isCjConfigured(): boolean {
  return !!(process.env.CJ_EMAIL && process.env.CJ_API_KEY);
}

export interface TrackingSyncResult {
  orderId: number;
  orderNumber: string;
  cjOrderNo: string;
  updated: boolean;
  trackingNumber?: string;
  carrier?: string;
  status?: string;
  error?: string;
}

export interface TrackingSyncSummary {
  total: number;
  updated: number;
  errors: number;
  results: TrackingSyncResult[];
}

export async function syncOrderTracking(orderId: number): Promise<TrackingSyncResult | null> {
  if (!isCjConfigured()) return null;
  
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, order_number, cj_order_no, cj_tracking_number, cj_carrier, shipping_status')
    .eq('id', orderId)
    .single();

  if (orderErr || !order || !order.cj_order_no) {
    return null;
  }

  const result: TrackingSyncResult = {
    orderId: order.id,
    orderNumber: order.order_number || `#${order.id}`,
    cjOrderNo: order.cj_order_no,
    updated: false,
  };

  try {
    const cj = new CjApi();
    const trackingData = await cj.getTrackingInfo(order.cj_order_no);
    
    const trackingInfo = trackingData?.data || trackingData;
    const trackingNumber = trackingInfo?.trackNumber || trackingInfo?.tracking_number || trackingInfo?.trackingNumber;
    const carrier = trackingInfo?.logisticName || trackingInfo?.carrier || trackingInfo?.logistics;
    const cjStatus = trackingInfo?.orderStatus || trackingInfo?.status;
    
    const statusMap: Record<string, string> = {
      'CREATED': 'processing',
      'PENDING': 'processing',
      'PROCESSING': 'processing',
      'SHIPPED': 'shipped',
      'IN_TRANSIT': 'in_transit',
      'DELIVERED': 'delivered',
      'CANCELLED': 'cancelled',
      'REFUNDED': 'refunded',
    };
    
    const newStatus = statusMap[cjStatus?.toUpperCase()] || order.shipping_status;
    
    const updates: any = {};
    let hasChanges = false;

    if (trackingNumber && trackingNumber !== order.cj_tracking_number) {
      updates.cj_tracking_number = trackingNumber;
      result.trackingNumber = trackingNumber;
      hasChanges = true;
    }

    if (carrier && carrier !== order.cj_carrier) {
      updates.cj_carrier = carrier;
      result.carrier = carrier;
      hasChanges = true;
    }

    if (newStatus && newStatus !== order.shipping_status) {
      updates.shipping_status = newStatus;
      result.status = newStatus;
      hasChanges = true;
    }

    if (hasChanges) {
      updates.updated_at = new Date().toISOString();
      
      const { error: updateErr } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);

      if (updateErr) {
        result.error = updateErr.message;
      } else {
        result.updated = true;
      }
    }

    return result;
  } catch (e: any) {
    result.error = e?.message || 'Failed to fetch tracking';
    return result;
  }
}

export async function syncAllPendingTracking(limit: number = 50): Promise<TrackingSyncSummary> {
  const supabase = getSupabaseAdmin();
  if (!supabase || !isCjConfigured()) {
    return { total: 0, updated: 0, errors: 0, results: [] };
  }

  const { data: orders, error: ordersErr } = await supabase
    .from('orders')
    .select('id, order_number, cj_order_no')
    .not('cj_order_no', 'is', null)
    .in('shipping_status', ['created', 'processing', 'shipped', 'in_transit'])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (ordersErr || !orders || orders.length === 0) {
    return { total: 0, updated: 0, errors: 0, results: [] };
  }

  const results: TrackingSyncResult[] = [];
  let updated = 0;
  let errors = 0;

  for (const order of orders) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const result = await syncOrderTracking(order.id);
    if (result) {
      results.push(result);
      if (result.updated) updated++;
      if (result.error) errors++;
    }
  }

  return {
    total: orders.length,
    updated,
    errors,
    results,
  };
}
