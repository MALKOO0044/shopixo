import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export interface AIMetric {
  metricType: string;
  agentName: string;
  value: number;
  previousValue?: number;
  delta?: number;
  unit: string;
  metadata?: Record<string, any>;
}

export interface AIMetricRecord {
  id: number;
  metricType: string;
  agentName: string;
  value: number;
  previousValue: number | null;
  delta: number | null;
  unit: string;
  metadata: Record<string, any>;
  recordedAt: Date;
}

export async function recordMetric(metric: AIMetric): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    console.warn('[AI Metrics] Supabase not configured, skipping metric recording');
    return false;
  }

  try {
    let previousValue = metric.previousValue;
    let delta = metric.delta;

    if (previousValue === undefined || delta === undefined) {
      const { data: lastMetric } = await admin
        .from('ai_metrics')
        .select('value')
        .eq('metric_type', metric.metricType)
        .eq('agent_name', metric.agentName)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      if (lastMetric) {
        previousValue = Number(lastMetric.value);
        delta = metric.value - previousValue;
      }
    }

    const { error } = await admin.from('ai_metrics').insert({
      metric_type: metric.metricType,
      agent_name: metric.agentName,
      value: metric.value,
      previous_value: previousValue ?? null,
      delta: delta ?? null,
      unit: metric.unit,
      metadata: metric.metadata || {},
      recorded_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[AI Metrics] Failed to record metric:', error.message);
      return false;
    }

    return true;
  } catch (e: any) {
    console.error('[AI Metrics] Error:', e?.message);
    return false;
  }
}

export async function getRecentMetrics(
  metricType?: string,
  agentName?: string,
  limit: number = 100
): Promise<AIMetricRecord[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  try {
    let query = admin
      .from('ai_metrics')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (metricType) {
      query = query.eq('metric_type', metricType);
    }
    if (agentName) {
      query = query.eq('agent_name', agentName);
    }

    const { data, error } = await query;

    if (error || !data) return [];

    return data.map(row => ({
      id: row.id,
      metricType: row.metric_type,
      agentName: row.agent_name,
      value: row.value,
      previousValue: row.previous_value,
      delta: row.delta,
      unit: row.unit,
      metadata: row.metadata || {},
      recordedAt: new Date(row.recorded_at),
    }));
  } catch (e: any) {
    console.error('[AI Metrics] Error getting metrics:', e?.message);
    return [];
  }
}

export async function getMetricsSummary(): Promise<{
  syncAccuracy: { current: number; trend: number };
  averageMargin: { current: number; trend: number };
  inventoryHealth: { current: number; trend: number };
  syncLatency: { current: number; trend: number };
  totalSyncs: number;
  totalPriceChanges: number;
  totalHealthChecks: number;
}> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      syncAccuracy: { current: 0, trend: 0 },
      averageMargin: { current: 0, trend: 0 },
      inventoryHealth: { current: 0, trend: 0 },
      syncLatency: { current: 0, trend: 0 },
      totalSyncs: 0,
      totalPriceChanges: 0,
      totalHealthChecks: 0,
    };
  }

  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const { data: recentMetrics } = await admin
      .from('ai_metrics')
      .select('*')
      .gte('recorded_at', twoDaysAgo.toISOString())
      .order('recorded_at', { ascending: false });

    const metrics = recentMetrics || [];

    const todayMetrics = metrics.filter(m => new Date(m.recorded_at) >= oneDayAgo);
    const yesterdayMetrics = metrics.filter(m => 
      new Date(m.recorded_at) < oneDayAgo && new Date(m.recorded_at) >= twoDaysAgo
    );

    const getLatestMetric = (list: any[], type: string) => 
      list.find(m => m.metric_type === type)?.value ?? 0;

    const getAverageMetric = (list: any[], type: string) => {
      const matching = list.filter(m => m.metric_type === type);
      if (matching.length === 0) return 0;
      return matching.reduce((sum, m) => sum + m.value, 0) / matching.length;
    };

    const syncAccuracyCurrent = getLatestMetric(todayMetrics, 'sync_accuracy') || getLatestMetric(metrics, 'sync_accuracy');
    const syncAccuracyPrev = getAverageMetric(yesterdayMetrics, 'sync_accuracy');

    const marginCurrent = getLatestMetric(todayMetrics, 'average_margin') || getLatestMetric(metrics, 'average_margin');
    const marginPrev = getAverageMetric(yesterdayMetrics, 'average_margin');

    const healthCurrent = getLatestMetric(todayMetrics, 'inventory_health') || getLatestMetric(metrics, 'inventory_health');
    const healthPrev = getAverageMetric(yesterdayMetrics, 'inventory_health');

    const latencyCurrent = getLatestMetric(todayMetrics, 'sync_latency') || getLatestMetric(metrics, 'sync_latency');
    const latencyPrev = getAverageMetric(yesterdayMetrics, 'sync_latency');

    const { count: syncCount } = await admin
      .from('ai_actions')
      .select('*', { count: 'exact', head: true })
      .in('action_type', ['auto_sync_run', 'apply_safe_changes']);

    const { count: priceCount } = await admin
      .from('ai_actions')
      .select('*', { count: 'exact', head: true })
      .eq('action_type', 'apply_price_change');

    const { count: healthCount } = await admin
      .from('ai_actions')
      .select('*', { count: 'exact', head: true })
      .eq('action_type', 'inventory_health_check');

    return {
      syncAccuracy: { 
        current: syncAccuracyCurrent, 
        trend: syncAccuracyCurrent - syncAccuracyPrev 
      },
      averageMargin: { 
        current: marginCurrent, 
        trend: marginCurrent - marginPrev 
      },
      inventoryHealth: { 
        current: healthCurrent, 
        trend: healthCurrent - healthPrev 
      },
      syncLatency: { 
        current: latencyCurrent, 
        trend: latencyCurrent - latencyPrev 
      },
      totalSyncs: syncCount || 0,
      totalPriceChanges: priceCount || 0,
      totalHealthChecks: healthCount || 0,
    };
  } catch (e: any) {
    console.error('[AI Metrics] Error getting summary:', e?.message);
    return {
      syncAccuracy: { current: 0, trend: 0 },
      averageMargin: { current: 0, trend: 0 },
      inventoryHealth: { current: 0, trend: 0 },
      syncLatency: { current: 0, trend: 0 },
      totalSyncs: 0,
      totalPriceChanges: 0,
      totalHealthChecks: 0,
    };
  }
}

export async function getMetricHistory(
  metricType: string,
  days: number = 7
): Promise<{ date: string; value: number }[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data } = await admin
      .from('ai_metrics')
      .select('value, recorded_at')
      .eq('metric_type', metricType)
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at', { ascending: true });

    if (!data) return [];

    const dailyValues: Record<string, number[]> = {};
    
    for (const row of data) {
      const date = new Date(row.recorded_at).toISOString().split('T')[0];
      if (!dailyValues[date]) dailyValues[date] = [];
      dailyValues[date].push(row.value);
    }

    return Object.entries(dailyValues).map(([date, values]) => ({
      date,
      value: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
    }));
  } catch (e: any) {
    console.error('[AI Metrics] Error getting history:', e?.message);
    return [];
  }
}
