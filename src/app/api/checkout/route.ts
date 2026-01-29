import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  if (key.startsWith('pk_')) {
    throw new Error('STRIPE_SECRET_KEY is set to a publishable key (pk_). Please use a secret key (sk_test_ or sk_live_) from your Stripe dashboard.');
  }
  return new Stripe(key);
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SX-${timestamp}-${random}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      items, 
      customer,
      shippingAddress,
      userId 
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    if (!shippingAddress || !shippingAddress.name || !shippingAddress.address1 || !shippingAddress.city || !shippingAddress.postalCode) {
      return NextResponse.json({ error: 'Complete shipping address required (name, address, city, postal code)' }, { status: 400 });
    }

    if (!shippingAddress.phone) {
      return NextResponse.json({ error: 'Phone number required for delivery notifications' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const productIds = items.map((i: any) => i.productId);
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id, title, price, images, cj_product_id, min_price')
      .in('id', productIds);

    if (prodErr || !products) {
      return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
    }

    const productMap = new Map(products.map(p => [p.id, p]));

    // Fetch ALL variants for these products to look up CJ IDs and names
    const { data: allVariants } = await supabase
      .from('product_variants')
      .select('id, product_id, cj_variant_id, cj_sku, option_name, option_value, color, size')
      .in('product_id', productIds);
    
    // Create maps for quick lookup
    const variantById = new Map((allVariants || []).map(v => [v.id, v]));
    const variantsByProduct = new Map<number, any[]>();
    for (const v of allVariants || []) {
      const list = variantsByProduct.get(v.product_id) || [];
      list.push(v);
      variantsByProduct.set(v.product_id, list);
    }
    
    console.log('[Checkout] Loaded variants for CJ lookup:', allVariants?.length || 0);

    let subtotal = 0;
    const lineItems: any[] = [];
    const orderItemsData: any[] = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) continue;

      const unitPrice = item.price || product.min_price || product.price;
      const quantity = item.quantity || 1;
      const totalPrice = unitPrice * quantity;
      subtotal += totalPrice;

      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.title,
            images: product.images?.slice(0, 1) || [],
          },
          unit_amount: Math.round(unitPrice * 100),
        },
        quantity: quantity,
      });

      // Look up CJ variant ID from product_variants table
      let cjVariantId = item.cjVariantId || null;
      let cjSku = item.cjSku || null;
      let resolvedVariantId = item.variantId || null;
      let resolvedVariantName = item.variantName || null;
      
      // First try: Direct variant ID lookup - get CJ IDs AND variant name
      if (item.variantId && variantById.has(item.variantId)) {
        const variant = variantById.get(item.variantId);
        cjVariantId = cjVariantId || variant?.cj_variant_id || null;
        cjSku = cjSku || variant?.cj_sku || null;
        
        // Build variant name from database if not provided by frontend
        if (!resolvedVariantName && variant) {
          // Use option_value directly (e.g., "Star blue-XL" or just "XL")
          resolvedVariantName = variant.option_value || null;
          console.log(`[Checkout] Resolved variant name from DB: "${resolvedVariantName}" (option_name: ${variant.option_name})`);
        }
        
        console.log(`[Checkout] Found variant ${item.variantId}: cj_vid=${cjVariantId}, name="${resolvedVariantName}"`);
      }
      
      // Second try: If no variant ID, use the first variant for this product (ONLY for single-variant products)
      if (!cjVariantId && !cjSku) {
        const productVariants = variantsByProduct.get(product.id) || [];
        if (productVariants.length === 1) {
          // Only use first variant if there's exactly one (single-variant product)
          const firstVariant = productVariants[0];
          cjVariantId = firstVariant.cj_variant_id || null;
          cjSku = firstVariant.cj_sku || null;
          resolvedVariantId = resolvedVariantId || firstVariant.id;
          if (!resolvedVariantName) {
            resolvedVariantName = firstVariant.option_value || null;
          }
          console.log(`[Checkout] Using only variant for product ${product.id}: variant_id=${firstVariant.id}, vid=${cjVariantId}`);
        } else if (productVariants.length > 1) {
          // Multi-variant product without variant selection - log warning
          console.warn(`[Checkout] WARNING: Product ${product.id} has ${productVariants.length} variants but no variant_id provided - customer must select a variant`);
        }
      }
      
      // Log warning if still no CJ IDs (product may not be from CJ or import incomplete)
      if (!cjVariantId && !cjSku && product.cj_product_id) {
        console.warn(`[Checkout] WARNING: CJ product ${product.id} (${product.cj_product_id}) has no variant CJ IDs - fulfillment may fail`);
      }

      orderItemsData.push({
        product_id: product.id,
        variant_id: resolvedVariantId,
        product_title: product.title,
        product_image: product.images?.[0] || null,
        variant_name: resolvedVariantName,
        cj_product_id: product.cj_product_id,
        cj_sku: cjSku,
        cj_variant_id: cjVariantId,
        quantity: quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
      });
    }

    const totalAmount = subtotal;
    const orderNumber = generateOrderNumber();

    const fullOrderData = {
      user_id: userId || null,
      order_number: orderNumber,
      status: 'pending',
      payment_status: 'pending',
      shipping_status: 'pending',
      subtotal: subtotal,
      shipping_cost: 0,
      tax: 0,
      total_amount: totalAmount,
      currency: 'USD',
      customer_email: customer?.email || shippingAddress.email || null,
      customer_name: customer?.name || shippingAddress.name,
      shipping_name: shippingAddress.name,
      shipping_phone: shippingAddress.phone || null,
      shipping_address1: shippingAddress.address1,
      shipping_address2: shippingAddress.address2 || null,
      shipping_city: shippingAddress.city,
      shipping_state: shippingAddress.state || null,
      shipping_postal_code: shippingAddress.postalCode,
      shipping_country: shippingAddress.country || 'US',
    };

    let order: { id: number } | null = null;
    let orderErr: any = null;

    const result1 = await supabase
      .from('orders')
      .insert(fullOrderData)
      .select('id')
      .single();
    
    if (result1.error) {
      console.error('[Checkout] Full insert failed:', result1.error.message);
      
      // Try with shipping info but without some optional fields
      const essentialOrderData = {
        user_id: userId || null,
        order_number: orderNumber,
        total_amount: totalAmount,
        status: 'pending',
        shipping_name: shippingAddress.name,
        shipping_phone: shippingAddress.phone || null,
        shipping_address1: shippingAddress.address1,
        shipping_address2: shippingAddress.address2 || null,
        shipping_city: shippingAddress.city,
        shipping_state: shippingAddress.state || null,
        shipping_postal_code: shippingAddress.postalCode,
        shipping_country: shippingAddress.country || 'US',
      };
      
      const result2 = await supabase
        .from('orders')
        .insert(essentialOrderData)
        .select('id')
        .single();
      
      if (result2.error) {
        console.error('[Checkout] Essential insert also failed:', result2.error.message);
        // FAIL HARD - do not create orders without shipping info as CJ fulfillment will break
        orderErr = new Error('Cannot save shipping address to database. Please contact support. Details: ' + result2.error.message);
      } else {
        order = result2.data;
        console.log('[Checkout] Created order with essential data including shipping info');
      }
    } else {
      order = result1.data;
    }

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Failed to create order: ' + (orderErr?.message || 'Unknown error') }, { status: 500 });
    }

    const orderItemsWithOrderId = orderItemsData.map(item => ({
      order_id: order!.id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      quantity: item.quantity,
      price: item.unit_price,
      product_title: item.product_title,
      cj_product_id: item.cj_product_id,
      cj_variant_id: item.cj_variant_id,
      cj_sku: item.cj_sku,
    }));

    console.log('[Checkout] Inserting order items:', JSON.stringify(orderItemsWithOrderId, null, 2));
    
    const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsWithOrderId);
    
    if (itemsErr) {
      console.error('[Checkout] Full order items insert failed:', itemsErr.message);
      
      const minimalItems = orderItemsData.map(item => ({
        order_id: order!.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.unit_price,
      }));
      
      const { error: minItemsErr } = await supabase.from('order_items').insert(minimalItems);
      if (minItemsErr) {
        console.error('[Checkout] Minimal order items insert also failed:', minItemsErr.message);
      } else {
        console.log('[Checkout] Inserted minimal order items (missing CJ fields in DB)');
      }
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://shopixo.net'}/order/success?session_id={CHECKOUT_SESSION_ID}&order=${orderNumber}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://shopixo.net'}/cart?cancelled=true`,
      customer_email: customer?.email || shippingAddress.email || undefined,
      metadata: {
        order_id: String(order.id),
        order_number: orderNumber,
        shipping_name: shippingAddress.name,
        shipping_phone: shippingAddress.phone,
        shipping_address1: shippingAddress.address1,
        shipping_address2: shippingAddress.address2 || '',
        shipping_city: shippingAddress.city,
        shipping_state: shippingAddress.state || '',
        shipping_postal_code: shippingAddress.postalCode,
        shipping_country: shippingAddress.country || 'US',
        customer_email: customer?.email || shippingAddress.email || '',
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 0, currency: 'usd' },
            display_name: 'Free Shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 7 },
              maximum: { unit: 'business_day', value: 14 },
            },
          },
        },
      ],
    });

    try {
      await supabase
        .from('orders')
        .update({ stripe_payment_intent_id: session.payment_intent as string || session.id })
        .eq('id', order.id);
    } catch (e) {
      console.warn('[Checkout] Could not update payment intent ID:', e);
    }

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      sessionUrl: session.url,
      orderNumber: orderNumber,
      orderId: order.id,
    });

  } catch (e: any) {
    console.error('[Checkout] Error:', e);
    return NextResponse.json({ error: e?.message || 'Checkout failed' }, { status: 500 });
  }
}
