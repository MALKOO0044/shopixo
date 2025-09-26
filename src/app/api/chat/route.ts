import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const runtime = 'nodejs';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const KNOWLEDGE = `
You are Shopixo Assistant. Language: Arabic primarily; answer in Arabic unless user writes in English.
Policies:
- KSA shipping: Prefer DDP door-to-door when available. DDP includes Customs Duty + 15% VAT + clearance + fuel/surcharges.
- Packaging: Neutral outer packaging. Allowed inserts: unbranded packing slip + neutral thank-you card.
- Sizes: Provide clear guidance; if unsure, suggest checking size charts.
- Order status: Ask user to log in and visit /order-tracking or share order number to check.
- Returns: Follow the return policy page at /return-policy.
`;

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
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
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    const fallback = 'مرحباً! أنا مساعد المتجر. للردود الذكية، فعّل مفتاح OPENAI_API_KEY في الخادم. بإمكانك دائماً طرح أسئلتك بالعربية وسأحاول مساعدتك.';
    return NextResponse.json({ reply: fallback });
  }
  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.AI_MODEL_TEXT || 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: KNOWLEDGE + (userFacts ? `\nContext: ${userFacts}` : '') },
          ...messages,
        ],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || '';
    return NextResponse.json({ reply });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Chat failed' }, { status: 500 });
  }
}
