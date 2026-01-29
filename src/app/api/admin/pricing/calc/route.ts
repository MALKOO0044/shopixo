import { NextRequest, NextResponse } from 'next/server';
import { calculateLandedCost } from '@/app/admin/pricing/actions';
import { ensureAdmin } from '@/lib/auth/admin-guard';
import { loggerForRequest } from '@/lib/log';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const log = loggerForRequest(req);
  const guard = await ensureAdmin();
  if (!guard.ok) {
    const r = NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    r.headers.set('x-request-id', log.requestId);
    return r;
  }

  let body: any;
  try { body = await req.json(); } catch {
    const r = NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    r.headers.set('x-request-id', log.requestId);
    return r;
  }
  try {
    const {
      supplierCostSar,
      actualKg,
      lengthCm,
      widthCm,
      heightCm,
      margin,
      handlingSar,
    } = body || {};
    const result = await calculateLandedCost({ supplierCostSar, actualKg, lengthCm, widthCm, heightCm, margin, handlingSar });
    const r = NextResponse.json(result);
    r.headers.set('x-request-id', log.requestId);
    return r;
  } catch (e: any) {
    const r = NextResponse.json({ error: e?.message || 'Calculation failed' }, { status: 400 });
    r.headers.set('x-request-id', log.requestId);
    return r;
  }
}
