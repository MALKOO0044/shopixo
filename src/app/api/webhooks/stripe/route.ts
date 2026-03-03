export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

import { handleStripeWebhook } from "@/lib/webhooks/stripe-handler";

export async function POST(req: Request) {
  return handleStripeWebhook(req);
}

export async function GET() {
  return new Response('OK');
}
