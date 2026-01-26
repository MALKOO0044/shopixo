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
  }
}
