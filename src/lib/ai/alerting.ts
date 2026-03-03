import { createClient } from "@supabase/supabase-js";
import { logAIAction } from "./action-logger";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export type AlertLevel = 'info' | 'warning' | 'critical';

export interface AIAlert {
  id?: number;
  alertType: string;
  level: AlertLevel;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  acknowledged: boolean;
  createdAt: Date;
}

export async function createAlert(
  alertType: string,
  level: AlertLevel,
  title: string,
  message: string,
  metadata?: Record<string, any>
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  try {
    const { error } = await admin.from('ai_alerts').insert({
      alert_type: alertType,
      level,
      title,
      message,
      metadata: metadata || {},
      acknowledged: false,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[AI Alerting] Failed to create alert:', error.message);
      return false;
    }

    await logAIAction({
      actionType: 'alert_created',
      agentName: 'security',
      explanation: `Created ${level} alert: ${title}`,
      severity: level === 'critical' ? 'critical' : level === 'warning' ? 'medium' : 'info',
      actionData: { alertType, level, title, message },
    });

    return true;
  } catch (e: any) {
    console.error('[AI Alerting] Error:', e?.message);
    return false;
  }
}

export async function getActiveAlerts(): Promise<AIAlert[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  try {
    const { data, error } = await admin
      .from('ai_alerts')
      .select('*')
      .eq('acknowledged', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) return [];

    return data.map(row => ({
      id: row.id,
      alertType: row.alert_type,
      level: row.level,
      title: row.title,
      message: row.message,
      metadata: row.metadata || {},
      acknowledged: row.acknowledged,
      createdAt: new Date(row.created_at),
    }));
  } catch (e: any) {
    console.error('[AI Alerting] Error getting alerts:', e?.message);
    return [];
  }
}

export async function acknowledgeAlert(alertId: number): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  try {
    const { error } = await admin
      .from('ai_alerts')
      .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
      .eq('id', alertId);

    return !error;
  } catch (e: any) {
    return false;
  }
}

export async function checkForAnomalies(): Promise<{
  alerts: AIAlert[];
  anomaliesFound: number;
}> {
  const admin = getSupabaseAdmin();
  if (!admin) return { alerts: [], anomaliesFound: 0 };

  const newAlerts: AIAlert[] = [];

  try {
    const { data: failedActions } = await admin
      .from('ai_actions')
      .select('id, action_type, agent_name')
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (failedActions && failedActions.length >= 5) {
      await createAlert(
        'high_failure_rate',
        'warning',
        'High AI Action Failure Rate',
        `${failedActions.length} AI actions have failed in the last 24 hours`,
        { failedCount: failedActions.length }
      );
      newAlerts.push({
        alertType: 'high_failure_rate',
        level: 'warning',
        title: 'High AI Action Failure Rate',
        message: `${failedActions.length} AI actions have failed in the last 24 hours`,
        acknowledged: false,
        createdAt: new Date(),
      });
    }

    const { data: outOfStockProducts } = await admin
      .from('products')
      .select('id', { count: 'exact' })
      .eq('stock', 0)
      .eq('active', true);

    if (outOfStockProducts && outOfStockProducts.length >= 10) {
      await createAlert(
        'many_out_of_stock',
        'warning',
        'Many Products Out of Stock',
        `${outOfStockProducts.length} active products are currently out of stock`,
        { outOfStockCount: outOfStockProducts.length }
      );
      newAlerts.push({
        alertType: 'many_out_of_stock',
        level: 'warning',
        title: 'Many Products Out of Stock',
        message: `${outOfStockProducts.length} active products are currently out of stock`,
        acknowledged: false,
        createdAt: new Date(),
      });
    }

    const { data: pendingChanges } = await admin
      .from('daily_sync_changes')
      .select('id', { count: 'exact' })
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

    if (pendingChanges && pendingChanges.length >= 10) {
      await createAlert(
        'stale_pending_changes',
        'warning',
        'Stale Pending Changes',
        `${pendingChanges.length} sync changes have been pending for more than 48 hours`,
        { staleCount: pendingChanges.length }
      );
      newAlerts.push({
        alertType: 'stale_pending_changes',
        level: 'warning',
        title: 'Stale Pending Changes',
        message: `${pendingChanges.length} sync changes have been pending for more than 48 hours`,
        acknowledged: false,
        createdAt: new Date(),
      });
    }

    const { data: healthScores } = await admin
      .from('product_health')
      .select('health_score')
      .lt('health_score', 50);

    if (healthScores && healthScores.length >= 5) {
      await createAlert(
        'critical_health_products',
        'critical',
        'Multiple Products with Critical Health',
        `${healthScores.length} products have health scores below 50%`,
        { criticalCount: healthScores.length }
      );
      newAlerts.push({
        alertType: 'critical_health_products',
        level: 'critical',
        title: 'Multiple Products with Critical Health',
        message: `${healthScores.length} products have health scores below 50%`,
        acknowledged: false,
        createdAt: new Date(),
      });
    }

    return {
      alerts: newAlerts,
      anomaliesFound: newAlerts.length,
    };
  } catch (e: any) {
    console.error('[AI Alerting] Anomaly check error:', e?.message);
    return { alerts: [], anomaliesFound: 0 };
  }
}

export async function getAlertsSummary(): Promise<{
  total: number;
  critical: number;
  warning: number;
  info: number;
  unacknowledged: number;
}> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { total: 0, critical: 0, warning: 0, info: 0, unacknowledged: 0 };
  }

  try {
    const { data: alerts } = await admin
      .from('ai_alerts')
      .select('level, acknowledged')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (!alerts) {
      return { total: 0, critical: 0, warning: 0, info: 0, unacknowledged: 0 };
    }

    return {
      total: alerts.length,
      critical: alerts.filter(a => a.level === 'critical').length,
      warning: alerts.filter(a => a.level === 'warning').length,
      info: alerts.filter(a => a.level === 'info').length,
      unacknowledged: alerts.filter(a => !a.acknowledged).length,
    };
  } catch (e: any) {
    return { total: 0, critical: 0, warning: 0, info: 0, unacknowledged: 0 };
  }
}
