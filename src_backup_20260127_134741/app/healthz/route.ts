export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET() {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
    NEXT_PUBLIC_SITE_URL: !!process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_URL: !!process.env.VERCEL_URL,
  } as const;

  const deployment = {
    vercel: !!process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV || null,
  } as const;

  return Response.json({
    ok: true,
    node: process.version,
    runtime: 'nodejs',
    env,
    deployment,
    timestamp: new Date().toISOString(),
  });
}
