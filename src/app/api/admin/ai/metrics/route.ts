import { NextRequest, NextResponse } from 'next/server';
import { getRecentMetrics, getMetricsSummary, getMetricHistory } from '@/lib/ai/metrics-tracker';
import { isAdminUser } from '@/lib/auth/admin-check';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { isAdmin } = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'summary';
    const metricType = url.searchParams.get('metric_type');
    const agentName = url.searchParams.get('agent_name');
    const days = parseInt(url.searchParams.get('days') || '7', 10);

    if (type === 'history' && metricType) {
      const history = await getMetricHistory(metricType, days);
      return NextResponse.json({
        success: true,
        history,
        metricType,
        days,
        timestamp: new Date().toISOString(),
      });
    }

    if (type === 'recent') {
      const metrics = await getRecentMetrics(metricType || undefined, agentName || undefined, 100);
      return NextResponse.json({
        success: true,
        metrics,
        timestamp: new Date().toISOString(),
      });
    }

    const summary = await getMetricsSummary();
    
    return NextResponse.json({
      success: true,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('[AI Metrics] Error:', e?.message);
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to get metrics' },
      { status: 500 }
    );
  }
}
