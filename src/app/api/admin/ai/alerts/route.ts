import { NextRequest, NextResponse } from 'next/server';
import { getActiveAlerts, acknowledgeAlert, checkForAnomalies, getAlertsSummary } from '@/lib/ai/alerting';
import { isAdminUser } from '@/lib/auth/admin-check';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { isAdmin } = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'active';

    if (type === 'summary') {
      const summary = await getAlertsSummary();
      return NextResponse.json({
        success: true,
        summary,
        timestamp: new Date().toISOString(),
      });
    }

    if (type === 'check') {
      const result = await checkForAnomalies();
      return NextResponse.json({
        success: true,
        ...result,
        timestamp: new Date().toISOString(),
      });
    }

    const alerts = await getActiveAlerts();
    
    return NextResponse.json({
      success: true,
      alerts,
      count: alerts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('[AI Alerts] Error:', e?.message);
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to get alerts' },
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
    const body = await request.json();
    const { action, alertId } = body;

    if (action === 'acknowledge' && alertId) {
      const success = await acknowledgeAlert(alertId);
      return NextResponse.json({
        success,
        message: success ? 'Alert acknowledged' : 'Failed to acknowledge alert',
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'check_anomalies') {
      const result = await checkForAnomalies();
      return NextResponse.json({
        success: true,
        ...result,
        message: `Found ${result.anomaliesFound} anomalies`,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (e: any) {
    console.error('[AI Alerts] Error:', e?.message);
    return NextResponse.json(
      { success: false, error: e?.message || 'Action failed' },
      { status: 500 }
    );
  }
}
