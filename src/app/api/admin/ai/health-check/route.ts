import { NextRequest, NextResponse } from 'next/server';
import { runInventoryHealthCheck, getInventoryAlerts } from '@/lib/ai/inventory-agent';
import { isAdminUser } from '@/lib/auth/admin-check';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { isAdmin } = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { stats, products } = await runInventoryHealthCheck();
    
    return NextResponse.json({
      success: true,
      stats,
      products: products.slice(0, 20),
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('[AI Health Check] Error:', e?.message);
    return NextResponse.json(
      { success: false, error: e?.message || 'Health check failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { isAdmin } = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const alerts = await getInventoryAlerts();
    
    return NextResponse.json({
      success: true,
      alerts,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('[AI Health Check] Error:', e?.message);
    return NextResponse.json(
      { success: false, error: e?.message || 'Alert check failed' },
      { status: 500 }
    );
  }
}
