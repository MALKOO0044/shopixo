import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { maybeCreateCjOrderForOrderId } from '@/lib/ops/cj-fulfill';

export const runtime = 'nodejs';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabaseAuth = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabaseAuth.auth.getUser();
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!user || (adminEmails.length > 0 && !adminEmails.includes((user.email || '').toLowerCase()))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const idNum = Number(params.id);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    return NextResponse.json({ error: 'Invalid order id' }, { status: 400 });
  }

  const res = await maybeCreateCjOrderForOrderId(idNum);
  if (!res.ok) {
    return NextResponse.json({ ok: false, reason: res.reason }, { status: 502 });
  }
  return NextResponse.json({ ok: true, info: res.info });
}
