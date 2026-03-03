import { handleStripeWebhook } from "@/lib/webhooks/stripe-handler";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export async function POST(req: Request) {
  return handleStripeWebhook(req);
}
