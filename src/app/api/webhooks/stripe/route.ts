export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

const message = "Deprecated endpoint. Use /api/stripe/webhook";

export async function POST() {
  return new Response(message, { status: 410 });
}

export async function GET() {
  return new Response(message, { status: 410 });
}
