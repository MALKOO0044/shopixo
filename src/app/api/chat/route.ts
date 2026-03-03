import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { chatLimiter, getClientIp } from '@/lib/ratelimit';
import { loggerForRequest } from '@/lib/log';
import { fetchWithMeta } from '@/lib/http';
import { ensureEnv, getEnv } from '@/lib/env';

export const runtime = 'nodejs';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const KNOWLEDGE = `
You are Shopixo Assistant. Language: English primarily.
Policies:
- US shipping: Fast delivery with DDP (Delivered Duty Paid) when available.
- Packaging: Neutral outer packaging. Allowed inserts: unbranded packing slip + neutral thank-you card.
- Sizes: Provide clear guidance; if unsure, suggest checking size charts.
- Order status: Ask user to log in and visit /order-tracking or share order number to check.
- Returns: Follow the return policy page at /return-policy.
`;

export async function POST(req: NextRequest) {
  const log = loggerForRequest(req);
  log.info('chat_start');
  // Rate limit per IP to protect provider costs
  try {
    const ip = getClientIp(req as unknown as Request);
    const lim = await chatLimiter.limit(`chat:${ip}`);
    if (!lim.success) {
      log.warn('chat_rate_limited', { ip });
      const r = NextResponse.json({ error: 'rate_limited' }, { status: 429 });
      r.headers.set('x-request-id', log.requestId);
      return r;
    }
  } catch {/* noop if limiter not configured */}
  let body: any;
  try { body = await req.json(); } catch {
    log.warn('chat_invalid_json');
    const r = NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    r.headers.set('x-request-id', log.requestId);
    return r;
  }
  const messages = Array.isArray(body.messages) ? body.messages : [];
  // Try to enrich with user context (recent orders / tracking)
  let userFacts = '';
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: orders } = await supabase
        .from('orders')
        .select('id, created_at, total_amount, status, tracking_number, carrier, shipping_status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (orders && orders.length > 0) {
        userFacts = `User has ${orders.length} recent orders. Top 1: #${orders[0].id} status=${orders[0].status} tracking=${orders[0].tracking_number || 'N/A'} carrier=${orders[0].carrier || 'N/A'} ship_status=${orders[0].shipping_status || 'N/A'}.`;
      }
    }
  } catch {}
  // Prefer centralized env access
  const key = (getEnv('OPENAI_API_KEY') as string | undefined) || process.env.OPENAI_API_KEY;
  if (!key) {
    const fallback = 'Hello! I am the store assistant. For smart responses, enable the OPENAI_API_KEY on the server. Feel free to ask your questions and I will try to help.';
    log.info('chat_no_api_key');
    const r = NextResponse.json({ reply: fallback });
    r.headers.set('x-request-id', log.requestId);
    return r;
  }
  try {
    const meta = await fetchWithMeta<any>(OPENAI_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: (getEnv('AI_MODEL_TEXT') as string | undefined) || process.env.AI_MODEL_TEXT || 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: KNOWLEDGE + (userFacts ? `\nContext: ${userFacts}` : '') },
          ...messages,
        ],
      }),
      timeoutMs: 18000,
      retries: 2,
    });
    if (!meta.ok) {
      log.warn('chat_provider_error', { status: meta.status });
      const r = NextResponse.json({ error: typeof meta.body === 'string' ? meta.body : (meta.body?.error?.message || 'Upstream failed') }, { status: 500 });
      r.headers.set('x-request-id', log.requestId);
      return r;
    }
    const data = meta.body;
    const reply = data?.choices?.[0]?.message?.content || '';
    const r = NextResponse.json({ reply });
    r.headers.set('x-request-id', log.requestId);
    return r;
  } catch (e: any) {
    log.error('chat_exception', { error: e?.message || String(e) });
    const r = NextResponse.json({ error: e?.message || 'Chat failed' }, { status: 500 });
    r.headers.set('x-request-id', log.requestId);
    return r;
  }
}
