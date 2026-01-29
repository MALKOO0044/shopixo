import { NextRequest, NextResponse } from 'next/server';
import { syncAllPendingTracking, syncOrderTracking } from '@/lib/ops/cj-tracking';
import { isAdminUser } from '@/lib/auth/admin-check';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { isAdmin } = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await syncAllPendingTracking(50);
    return NextResponse.json({
      success: true,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('[Tracking Sync] Error:', e);
    return NextResponse.json({ error: e?.message || 'Sync failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { isAdmin } = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const orderId = body.orderId;

    if (orderId) {
      const result = await syncOrderTracking(orderId);
      return NextResponse.json({
        success: true,
        result,
        timestamp: new Date().toISOString(),
      });
    }

    const limit = body.limit || 50;
    const summary = await syncAllPendingTracking(limit);
    return NextResponse.json({
      success: true,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('[Tracking Sync] Error:', e);
    return NextResponse.json({ error: e?.message || 'Sync failed' }, { status: 500 });
  }
}
