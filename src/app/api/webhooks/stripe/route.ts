import { handleStripeWebhook } from "@/lib/stripe-webhook-handler";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  return handleStripeWebhook(req);
}
