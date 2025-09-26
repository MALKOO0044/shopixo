import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { calculateLandedCost } from '@/app/admin/pricing/actions';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const supabaseAuth = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabaseAuth.auth.getUser();
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!user || (adminEmails.length > 0 && !adminEmails.includes((user.email || '').toLowerCase()))) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
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
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Calculation failed' }, { status: 400 });
  }
}
