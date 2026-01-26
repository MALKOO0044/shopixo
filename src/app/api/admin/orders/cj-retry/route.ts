import { NextRequest, NextResponse } from 'next/server';
import { retryFailedCjOrders, getPendingCjOrders } from '@/lib/ops/cj-order-retry';
import { isAdminUser } from '@/lib/auth/admin-check';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { isAdmin } = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const pendingOrders = await getPendingCjOrders();
    return NextResponse.json({
      success: true,
      pendingOrders,
      count: pendingOrders.length,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('[CJ Retry] Error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to fetch pending orders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { isAdmin } = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const limit = body.limit || 20;

    const summary = await retryFailedCjOrders(limit);
    
    return NextResponse.json({
      success: true,
      summary,
      message: `Processed ${summary.total} orders: ${summary.successful} successful, ${summary.failed} failed`,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('[CJ Retry] Error:', e);
    return NextResponse.json({ error: e?.message || 'Retry failed' }, { status: 500 });
  }
}
