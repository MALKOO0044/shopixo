import { createClient } from '@supabase/supabase-js';
import { maybeCreateCjOrderForOrderId } from './cj-fulfill';
import { createAlert } from '@/lib/ai/alerting';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export interface RetryResult {
  orderId: number;
  orderNumber: string;
  success: boolean;
  cjOrderNo?: string;
  error?: string;
}

export interface RetrySummary {
  total: number;
  successful: number;
  failed: number;
  results: RetryResult[];
}

export async function retryFailedCjOrders(limit: number = 20): Promise<RetrySummary> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { total: 0, successful: 0, failed: 0, results: [] };
  }

  const { data: orders, error: ordersErr } = await supabase
    .from('orders')
    .select('id, order_number, status, cj_order_no, shipping_status')
    .is('cj_order_no', null)
    .eq('status', 'paid')
    .in('shipping_status', ['pending', 'awaiting_supplier', null])
    .order('created_at', { ascending: true })
    .limit(limit);

  if (ordersErr || !orders || orders.length === 0) {
    return { total: 0, successful: 0, failed: 0, results: [] };
  }

  const results: RetryResult[] = [];
  let successful = 0;
  let failed = 0;

  for (const order of orders) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const result: RetryResult = {
      orderId: order.id,
      orderNumber: order.order_number || `#${order.id}`,
      success: false,
    };

    try {
      const cjResult = await maybeCreateCjOrderForOrderId(order.id);
      
      if (cjResult.ok) {
        result.success = true;
        result.cjOrderNo = cjResult.info?.orderNo || cjResult.info?.order_no;
        successful++;
      } else {
        result.error = cjResult.reason || 'Unknown error';
        failed++;
        
        await supabase
          .from('orders')
          .update({ shipping_status: 'awaiting_supplier' })
          .eq('id', order.id);
      }
    } catch (e: any) {
      result.error = e?.message || 'Exception during CJ order creation';
      failed++;
      
      await supabase
        .from('orders')
        .update({ shipping_status: 'awaiting_supplier' })
        .eq('id', order.id);
    }

    results.push(result);
  }

  if (failed > 0) {
    try {
      await createAlert(
        'cj_order_failures',
        failed >= 5 ? 'critical' : 'warning',
        `${failed} CJ order(s) failed to create`,
        `Retry job found ${orders.length} pending orders, ${failed} failed to create CJ orders. Manual intervention may be required.`,
        {
          totalAttempted: orders.length,
          successful,
          failed,
          failedOrders: results.filter(r => !r.success).map(r => r.orderNumber),
        }
      );
    } catch (alertErr) {
      console.error('[CJ Retry] Failed to create alert:', alertErr);
    }
  }

  return {
    total: orders.length,
    successful,
    failed,
    results,
  };
}

export async function getPendingCjOrders(): Promise<Array<{ id: number; orderNumber: string; createdAt: string; total: number }>> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, created_at, total_amount')
    .is('cj_order_no', null)
    .eq('status', 'paid')
    .order('created_at', { ascending: true })
    .limit(100);

  return (orders || []).map(o => ({
    id: o.id,
    orderNumber: o.order_number || `#${o.id}`,
    createdAt: o.created_at,
    total: o.total_amount,
  }));
}
