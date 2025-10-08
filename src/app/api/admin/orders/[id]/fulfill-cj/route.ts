import { NextRequest, NextResponse } from 'next/server';
import { maybeCreateCjOrderForOrderId } from '@/lib/ops/cj-fulfill';
import { ensureAdmin } from '@/lib/auth/admin-guard';
import { loggerForRequest } from '@/lib/log';
import { isKillSwitchOn } from '@/lib/settings';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const log = loggerForRequest(req);
  const guard = await ensureAdmin();
  if (!guard.ok) {
    const r = NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    r.headers.set('x-request-id', log.requestId);
    return r;
  }

  // Global kill-switch enforcement
  if (await isKillSwitchOn()) {
    const r = NextResponse.json({ ok: false, error: 'Kill switch is ON. Fulfillment is disabled.' }, { status: 423 });
    r.headers.set('x-request-id', log.requestId);
    return r;
  }

  const idNum = Number(params.id);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const r = NextResponse.json({ error: 'Invalid order id' }, { status: 400 });
    r.headers.set('x-request-id', log.requestId);
    return r;
  }

  const res = await maybeCreateCjOrderForOrderId(idNum);
  if (!res.ok) {
    const r = NextResponse.json({ ok: false, reason: res.reason }, { status: 502 });
    r.headers.set('x-request-id', log.requestId);
    return r;
  }
  const r = NextResponse.json({ ok: true, info: res.info });
  r.headers.set('x-request-id', log.requestId);
  return r;
}
