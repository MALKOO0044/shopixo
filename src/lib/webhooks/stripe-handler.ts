<<<<<<< HEAD
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { maybeCreateCjOrderForOrderId } from '@/lib/ops/cj-fulfill';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '');
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function handleStripeWebhook(req: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return new Response('Stripe not configured', { status: 501 });
  }
  
  const stripe = getStripe();
  const sig = req.headers.get('stripe-signature') || '';
  const body = await req.text();
  
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: any) {
    console.error('[Stripe Webhook] Invalid signature:', err?.message);
    return new Response('Invalid signature', { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('[Stripe Webhook] Supabase not configured');
    return new Response('Database not configured', { status: 500 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;
        const orderNumber = session.metadata?.order_number;
        const metadata = session.metadata || {};
        
        console.log(`[Stripe Webhook] Checkout completed for order ${orderNumber} (ID: ${orderId})`);
        
        if (orderId) {
          const updateData: Record<string, any> = {
            status: 'paid',
            payment_status: 'paid',
            stripe_payment_intent_id: session.payment_intent as string || session.id,
            paid_at: new Date().toISOString(),
          };
          
          if (metadata.shipping_name) {
            updateData.shipping_name = metadata.shipping_name;
            updateData.shipping_phone = metadata.shipping_phone || null;
            updateData.shipping_address1 = metadata.shipping_address1 || null;
            updateData.shipping_address2 = metadata.shipping_address2 || null;
            updateData.shipping_city = metadata.shipping_city || null;
            updateData.shipping_state = metadata.shipping_state || null;
            updateData.shipping_postal_code = metadata.shipping_postal_code || null;
            updateData.shipping_country = metadata.shipping_country || 'US';
          }
          
          if (metadata.customer_email) {
            updateData.customer_email = metadata.customer_email;
          }

          const { error: updateErr } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', parseInt(orderId));
          
          if (updateErr) {
            console.error('[Stripe Webhook] Failed to update order:', updateErr);
            
            const { error: minimalErr } = await supabase
              .from('orders')
              .update({ status: 'paid' })
              .eq('id', parseInt(orderId));
            
            if (minimalErr) {
              console.error('[Stripe Webhook] Minimal update also failed:', minimalErr);
            }
          } else {
            console.log(`[Stripe Webhook] Order ${orderNumber} marked as paid`);
          }
          
          const shippingInfo = metadata.shipping_name ? {
            name: metadata.shipping_name,
            phone: metadata.shipping_phone || '',
            address1: metadata.shipping_address1 || '',
            address2: metadata.shipping_address2 || '',
            city: metadata.shipping_city || '',
            state: metadata.shipping_state || '',
            postalCode: metadata.shipping_postal_code || '',
            country: metadata.shipping_country || 'US',
            email: metadata.customer_email || session.customer_email || '',
          } : undefined;
          
          const cjResult = await maybeCreateCjOrderForOrderId(parseInt(orderId), shippingInfo);
          if (cjResult.ok) {
            console.log(`[Stripe Webhook] CJ order created for order ${orderNumber}:`, cjResult.info);
          } else {
            console.warn(`[Stripe Webhook] CJ order creation skipped for ${orderNumber}: ${cjResult.reason}`);
          }
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Stripe Webhook] Payment intent succeeded: ${paymentIntent.id}`);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        console.log(`[Stripe Webhook] Charge refunded: ${charge.id}`);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return new Response('ok');
  } catch (e: any) {
    console.error('[Stripe Webhook] Error processing webhook:', e);
    return new Response('Webhook error', { status: 500 });
=======
import Stripe from 'stripe'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '')
}

export async function handleStripeWebhook(req: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || !process.env.STRIPE_SECRET_KEY) return new Response('Stripe not configured', { status: 501 })
  
  const stripe = getStripe()
  const sig = req.headers.get('stripe-signature') || ''
  const body = await req.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }
  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'payment_intent.succeeded':
      case 'charge.refunded':
      default:
        break
    }
    return new Response('ok')
  } catch {
    return new Response('Webhook error', { status: 500 })
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
  }
}
