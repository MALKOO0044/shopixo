import { createClient } from "@supabase/supabase-js";

export type AIAgent = 
  | 'merchandising'
  | 'operations'
  | 'inventory'
  | 'pricing'
  | 'security'
  | 'intelligence'
  | 'marketing'
  | 'service';

export type ActionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';
export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface AIActionInput {
  actionType: string;
  agentName: AIAgent;
  entityType?: string;
  entityId?: string;
  actionData?: Record<string, any>;
  explanation?: string;
  confidenceScore?: number;
  canRollback?: boolean;
  severity?: Severity;
}

export interface AIAction extends AIActionInput {
  id: number;
  status: ActionStatus;
  resultData: Record<string, any>;
  rolledBack: boolean;
  createdAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function logAIAction(input: AIActionInput): Promise<number | null> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    console.error('[AI Logger] Supabase admin client not available');
    return null;
  }

  try {
    const { data, error } = await admin
      .from('ai_actions')
      .insert({
        action_type: input.actionType,
        agent_name: input.agentName,
        entity_type: input.entityType || null,
        entity_id: input.entityId || null,
        action_data: input.actionData || {},
        explanation: input.explanation || null,
        confidence_score: input.confidenceScore || null,
        can_rollback: input.canRollback || false,
        severity: input.severity || 'info',
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error('[AI Logger] Failed to log action:', error.message);
      return null;
    }

    return data?.id || null;
  } catch (e: any) {
    console.error('[AI Logger] Error:', e?.message);
    return null;
  }
}

export async function updateAIAction(
  actionId: number,
  updates: {
    status?: ActionStatus;
    resultData?: Record<string, any>;
    errorMessage?: string;
    completedAt?: Date;
  }
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  try {
    const updateData: Record<string, any> = {};
    if (updates.status) updateData.status = updates.status;
    if (updates.resultData) updateData.result_data = updates.resultData;
    if (updates.errorMessage) updateData.error_message = updates.errorMessage;
    if (updates.completedAt) updateData.completed_at = updates.completedAt.toISOString();
    if (updates.status === 'completed' || updates.status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await admin
      .from('ai_actions')
      .update(updateData)
      .eq('id', actionId);

    if (error) {
      console.error('[AI Logger] Failed to update action:', error.message);
      return false;
    }

    return true;
  } catch (e: any) {
    console.error('[AI Logger] Update error:', e?.message);
    return false;
  }
}

export async function getRecentAIActions(limit: number = 50): Promise<AIAction[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  try {
    const { data, error } = await admin
      .from('ai_actions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[AI Logger] Failed to get actions:', error.message);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      actionType: row.action_type,
      agentName: row.agent_name,
      entityType: row.entity_type,
      entityId: row.entity_id,
      actionData: row.action_data || {},
      resultData: row.result_data || {},
      status: row.status,
      severity: row.severity,
      explanation: row.explanation,
      confidenceScore: row.confidence_score,
      canRollback: row.can_rollback,
      rolledBack: row.rolled_back,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      errorMessage: row.error_message,
    }));
  } catch (e: any) {
    console.error('[AI Logger] Get actions error:', e?.message);
    return [];
  }
}

export async function getAIActionStats(): Promise<{
  total: number;
  completed: number;
  failed: number;
  pending: number;
  byAgent: Record<string, number>;
}> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { total: 0, completed: 0, failed: 0, pending: 0, byAgent: {} };
  }

  try {
    const { data, error } = await admin
      .from('ai_actions')
      .select('status, agent_name');

    if (error || !data) {
      return { total: 0, completed: 0, failed: 0, pending: 0, byAgent: {} };
    }

    const stats = {
      total: data.length,
      completed: data.filter(a => a.status === 'completed').length,
      failed: data.filter(a => a.status === 'failed').length,
      pending: data.filter(a => a.status === 'pending' || a.status === 'running').length,
      byAgent: {} as Record<string, number>,
    };

    data.forEach(action => {
      const agent = action.agent_name;
      stats.byAgent[agent] = (stats.byAgent[agent] || 0) + 1;
    });

    return stats;
  } catch (e: any) {
    return { total: 0, completed: 0, failed: 0, pending: 0, byAgent: {} };
  }
}

export async function rollbackAIAction(actionId: number): Promise<{ success: boolean; message: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) return { success: false, message: 'Database not configured' };

  try {
    const { data: action, error: fetchError } = await admin
      .from('ai_actions')
      .select('*')
      .eq('id', actionId)
      .single();

    if (fetchError || !action) {
      return { success: false, message: 'Action not found' };
    }

    if (!action.can_rollback) {
      return { success: false, message: 'This action cannot be rolled back' };
    }

    if (action.rolled_back) {
      return { success: false, message: 'Action has already been rolled back' };
    }

    const resultData = action.result_data || {};
    const entityType = action.entity_type;
    const entityId = action.entity_id;

    if (action.action_type === 'apply_price_change' && entityType === 'product' && entityId) {
      const oldPrice = resultData.oldPrice;
      if (typeof oldPrice === 'number') {
        const { error: updateError } = await admin
          .from('products')
          .update({ 
            price: oldPrice,
            updated_at: new Date().toISOString(),
          })
          .eq('id', Number(entityId));

        if (updateError) {
          return { success: false, message: `Failed to restore price: ${updateError.message}` };
        }
      } else {
        return { success: false, message: 'Original price not stored, cannot rollback' };
      }
    }

    if ((action.action_type === 'apply_safe_changes' || action.action_type === 'auto_sync_run') && resultData.changes) {
      const productUpdates: Record<number, Record<string, any>> = {};
      const syncChangeIds: Set<number> = new Set();
      
      for (const change of resultData.changes || []) {
        if (!change.productId) continue;
        
        if (!productUpdates[change.productId]) {
          productUpdates[change.productId] = { updated_at: new Date().toISOString() };
        }
        
        if (change.field === 'stock' && typeof change.oldValue === 'number') {
          productUpdates[change.productId].stock = change.oldValue;
        }
        if (change.field === 'price' && typeof change.oldValue === 'number') {
          productUpdates[change.productId].price = change.oldValue;
        }
        if (change.field === 'active' && typeof change.oldValue === 'boolean') {
          productUpdates[change.productId].active = change.oldValue;
        }
        
        if (change.syncChangeId) {
          syncChangeIds.add(change.syncChangeId);
        }
      }

      for (const [productId, updates] of Object.entries(productUpdates)) {
        await admin
          .from('products')
          .update(updates)
          .eq('id', Number(productId));
      }

      if (syncChangeIds.size > 0) {
        await admin
          .from('daily_sync_changes')
          .update({ status: 'rolled_back' })
          .in('id', Array.from(syncChangeIds));
      }
    }

    const { error } = await admin
      .from('ai_actions')
      .update({ 
        rolled_back: true, 
        status: 'rolled_back' 
      })
      .eq('id', actionId);

    if (error) {
      return { success: false, message: `Failed to mark as rolled back: ${error.message}` };
    }

    return { success: true, message: 'Action successfully rolled back' };
  } catch (e: any) {
    console.error('[AI Logger] Rollback error:', e?.message);
    return { success: false, message: e?.message || 'Rollback failed' };
  }
}
