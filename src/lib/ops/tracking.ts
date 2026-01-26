import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Persist CJ tracking payload to orders table when possible.
 * Tries best-effort mappings because exact payload schema may vary until docs are confirmed.
 */
export async function persistCjTracking(payload: any): Promise<{ ok: boolean; reason?: string }>{
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, reason: 'Supabase not configured' };

  // Extract identifiers
  const event = payload?.event || payload?.type || 'unknown';
  const data = payload?.data || payload || {};
  const orderId = Number(data.orderId || data.order_id || data.shopixoOrderId || 0) || undefined;
  const orderNo = String(data.orderNo || data.order_no || data.cjOrderNo || '') || undefined;
  const trackingNumber = data.trackingNo || data.tracking_number || data.tracking || undefined;
  const carrier = data.carrier || data.lastmile || data.express || undefined;
  const status = data.status || data.event || payload?.event || undefined;

  // Prefer direct order id; else try match by cj_order_no column if exists
  try {
    if (orderId) {
      const update: any = {};
      if (trackingNumber) update.tracking_number = trackingNumber;
      if (carrier) update.carrier = carrier;
      if (status) update.shipping_status = status;
      if (orderNo) update.cj_order_no = orderNo;
      if (Object.keys(update).length === 0) return { ok: true };
      const { error } = await admin
        .from('orders')
        .update(update)
        .eq('id', orderId);
      if (error) {
        console.warn('persistCjTracking: update by order id failed', error);
      }
      return { ok: true };
    }
  } catch (e) {
    console.warn('persistCjTracking error id path:', e);
  }

  try {
    if (orderNo) {
      const update: any = {};
      if (trackingNumber) update.tracking_number = trackingNumber;
      if (carrier) update.carrier = carrier;
      if (status) update.shipping_status = status;
      const { error } = await admin
        .from('orders')
        .update(update)
        .eq('cj_order_no', orderNo);
      if (error) {
        console.warn('persistCjTracking: update by cj_order_no failed', error);
        return { ok: false, reason: error.message };
      }
      return { ok: true };
    }
  } catch (e: any) {
    return { ok: false, reason: e?.message || 'update failed' };
  }

  return { ok: false, reason: 'no identifiers found' };
}
