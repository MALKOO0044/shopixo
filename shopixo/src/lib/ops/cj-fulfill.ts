import { createClient } from '@supabase/supabase-js';
import { CjApi } from '@/lib/cj/api';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function isCjConfigured(): boolean {
  return !!(process.env.CJ_APP_KEY && process.env.CJ_APP_SECRET && (process.env.CJ_API_BASE || process.env.CJ_API_BASE_SANDBOX));
}

export async function maybeCreateCjOrderForOrderId(orderId: number, shippingInfo?: any): Promise<{ ok: boolean; info?: any; reason?: string }> {
  if (!isCjConfigured()) {
    return { ok: false, reason: 'CJ API not configured' };
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, reason: 'Supabase not configured' };

  // 1) Load order
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, user_id, total_amount, status')
    .eq('id', orderId)
    .single();
  if (orderErr || !order) return { ok: false, reason: 'Order not found' };

  // 2) Load order items (include variant_id)
  const { data: items, error: itemsErr } = await supabase
    .from('order_items')
    .select('product_id, variant_id, quantity, price')
    .eq('order_id', orderId);
  if (itemsErr || !items || items.length === 0) return { ok: false, reason: 'No order items' };

  // 3) Load minimal product info (title, slug) used as fallback SKU mapping
  const productIds = items.map((i) => i.product_id);
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, title, slug')
    .in('id', productIds);
  if (prodErr) {
    // Non-fatal; continue with minimal mapping
  }
  const productMap = new Map<number, { title: string; slug: string }>();
  for (const p of products || []) productMap.set(p.id, { title: p.title, slug: p.slug });

  // 3b) Load variant info for those items that have variant_id (to extract cj_sku)
  const variantIds = items.map((i) => i.variant_id).filter((v: any) => v !== null && v !== undefined) as number[];
  let variantMap = new Map<number, { cj_sku: string | null; option_name: string | null; option_value: string | null }>();
  if (variantIds.length > 0) {
    const { data: variants } = await supabase
      .from('product_variants')
      .select('id, cj_sku, option_name, option_value')
      .in('id', variantIds);
    for (const v of variants || []) {
      variantMap.set(v.id, { cj_sku: v.cj_sku, option_name: v.option_name, option_value: v.option_value });
    }
  }

  // 4) Load recipient (default address of user) or use provided shippingInfo
  let addr;
  if (shippingInfo) {
    addr = shippingInfo;
  } else {
    const { data: addressData } = await supabase
      .from('addresses')
      .select('full_name, phone, line1, line2, city, state, postal_code, country, is_default')
      .eq('user_id', order.user_id)
      .order('is_default', { ascending: false })
      .limit(1)
      .maybeSingle();
    addr = addressData;
  }

  if (!addr) return { ok: false, reason: 'Missing recipient address; cannot create CJ order yet' };

  // 5) Build CJ payload (placeholder structure; adjust to CJ docs when provided)
  const payload = {
    orderNo: `SHOPIXO-${order.id}-${Date.now()}`,
    recipient: {
      name: addr.name || addr.full_name,
      phone: addr.phone,
      country: addr.country,
      state: addr.state,
      city: addr.city,
      address1: addr.address1 || addr.line1,
      address2: addr.address2 || addr.line2,
      postalCode: addr.postalCode || addr.postal_code,
    },
    // Choose service code once provided by CJ (e.g., 'KSA_DDP_ECONOMY')
    serviceCode: 'KSA_DDP_ECONOMY',
    // Packaging instructions
    packaging: {
      neutral: true,
      includePackingSlip: true,
      includeThankYouCard: true,
    },
    items: items.map((it) => {
      const meta = productMap.get(it.product_id as number);
      const vmeta = (it as any).variant_id ? variantMap.get((it as any).variant_id) : null;
      const sku = vmeta?.cj_sku || meta?.slug || String(it.product_id);
      const optionLabel = vmeta?.option_value ? ` (${vmeta.option_value})` : '';
      return {
        sku,
        name: (meta?.title || `Product ${it.product_id}`) + optionLabel,
        quantity: it.quantity,
      };
    }),
  };

  const cj = new CjApi();
  try {
    const res = await cj.createOrder(payload);
    try {
      const cjOrderNo = res?.orderNo || res?.order_no || res?.id || res?.data?.orderNo || null;
      if (cjOrderNo) {
        await supabase
          .from('orders')
          .update({ cj_order_no: String(cjOrderNo), shipping_status: 'created' })
          .eq('id', orderId);
      }
    } catch (e) {
      // Best-effort: do not fail the main call
      console.warn('Failed to persist CJ order number:', e);
    }
    return { ok: true, info: res };
  } catch (e: any) {
    return { ok: false, reason: e?.message || 'CJ create order failed' };
  }
}
