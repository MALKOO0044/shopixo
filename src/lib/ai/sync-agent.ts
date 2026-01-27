import { createClient } from "@supabase/supabase-js";
import { logAIAction, updateAIAction } from "./action-logger";
import { recordMetric } from "./metrics-tracker";
import { queryProductByPidOrKeyword, mapCjItemToProductLike } from "@/lib/cj/v2";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const SAFETY_BUFFER = 5;

async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; delayMs?: number; backoffFactor?: number } = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 500, backoffFactor = 2 } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      if (attempt < maxRetries) {
        const delay = delayMs * Math.pow(backoffFactor, attempt);
        const jitter = Math.random() * delay * 0.1;
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      }
    }
  }

  throw lastError;
}

export interface SyncResult {
  productId: number;
  productTitle: string;
  cjProductId: string;
  changes: SyncChange[];
  status: 'synced' | 'changed' | 'error';
  error?: string;
}

export interface SyncChange {
  field: string;
  oldValue: any;
  newValue: any;
  autoApplied: boolean;
  syncChangeId?: number;
}

export interface SyncSummary {
  totalProducts: number;
  synced: number;
  changed: number;
  errors: number;
  autoAppliedChanges: number;
  pendingApproval: number;
  results: SyncResult[];
  metrics?: {
    syncAccuracy: number;
    syncLatencyMs: number;
    stockMatchRate: number;
  };
}

export async function runAutoSync(options?: { maxProducts?: number }): Promise<SyncSummary> {
  const startTime = Date.now();
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      totalProducts: 0,
      synced: 0,
      changed: 0,
      errors: 0,
      autoAppliedChanges: 0,
      pendingApproval: 0,
      results: [],
    };
  }

  const maxProducts = options?.maxProducts || 500;

  const actionId = await logAIAction({
    actionType: 'auto_sync_run',
    agentName: 'operations',
    explanation: `Running automated CJ product sync (up to ${maxProducts} products)`,
    severity: 'info',
    canRollback: true,
  });

  try {
    const allProducts: any[] = [];
    let offset = 0;
    const batchSize = 100;
    const seenIds = new Set<number>();
    let fetchErrors: string[] = [];

    while (offset < maxProducts) {
      let batch: any[] | null = null;
      let batchError: Error | null = null;

      try {
        const result = await withRetry(async () => {
          const { data, error } = await admin
            .from('products')
            .select('id, title, price, stock, active, category, metadata')
            .not('metadata->cj_product_id', 'is', null)
            .order('id', { ascending: true })
            .range(offset, offset + batchSize - 1);
          if (error) throw error;
          return data;
        }, { maxRetries: 3, delayMs: 1000, backoffFactor: 2 });
        batch = result;
      } catch (e: any) {
        console.error(`[AI Sync] Batch fetch failed at offset ${offset} after 3 retries:`, e?.message);
        batchError = e;
      }

      if (batchError) {
        fetchErrors.push(`Batch ${offset}: ${batchError.message}`);
        if (allProducts.length === 0) {
          throw new Error(`Failed to fetch products: ${batchError.message}`);
        }
        break;
      }
      
      if (!batch || batch.length === 0) break;
      
      for (const product of batch) {
        if (!seenIds.has(product.id)) {
          seenIds.add(product.id);
          allProducts.push(product);
        }
      }
      
      offset += batchSize;

      if (batch.length < batchSize) break;
    }

    const products = allProducts.slice(0, maxProducts);

    if (products.length === 0 && fetchErrors.length > 0) {
      throw new Error(`Failed to fetch products: ${fetchErrors.join(', ')}`);
    }

    const results: SyncResult[] = [];
    let synced = 0;
    let changed = 0;
    let errors = 0;
    let autoAppliedChanges = 0;
    let pendingApproval = 0;

    for (const product of products) {
      const cjProductId = product.metadata?.cj_product_id;
      if (!cjProductId) continue;

      try {
        const syncResult = await syncSingleProduct(admin, product);
        results.push(syncResult);

        if (syncResult.status === 'synced') {
          synced++;
        } else if (syncResult.status === 'changed') {
          changed++;
          autoAppliedChanges += syncResult.changes.filter(c => c.autoApplied).length;
          pendingApproval += syncResult.changes.filter(c => !c.autoApplied).length;
        } else {
          errors++;
        }
      } catch (e: any) {
        results.push({
          productId: product.id,
          productTitle: product.title,
          cjProductId,
          changes: [],
          status: 'error',
          error: e?.message || 'Unknown error',
        });
        errors++;
      }
    }

    const syncLatencyMs = Date.now() - startTime;
    const syncAccuracy = products.length > 0 
      ? Math.round(((synced + changed) / products.length) * 100) 
      : 0;
    const stockMatchRate = products.length > 0 
      ? Math.round((synced / products.length) * 100) 
      : 0;

    const summary: SyncSummary = {
      totalProducts: products.length,
      synced,
      changed,
      errors,
      autoAppliedChanges,
      pendingApproval,
      results,
      metrics: {
        syncAccuracy,
        syncLatencyMs,
        stockMatchRate,
      },
    };

    const appliedChanges: Array<{ productId: number; field: string; oldValue: any; newValue: any; syncChangeId?: number }> = [];
    for (const result of results) {
      for (const change of result.changes) {
        if (change.autoApplied) {
          appliedChanges.push({
            productId: result.productId,
            field: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue,
            syncChangeId: change.syncChangeId,
          });
        }
      }
    }

    await Promise.all([
      recordMetric({
        metricType: 'sync_accuracy',
        agentName: 'operations',
        value: syncAccuracy,
        unit: 'percent',
        metadata: { totalProducts: products.length, synced, errors },
      }),
      recordMetric({
        metricType: 'sync_latency',
        agentName: 'operations',
        value: syncLatencyMs,
        unit: 'ms',
        metadata: { totalProducts: products.length },
      }),
      recordMetric({
        metricType: 'stock_match_rate',
        agentName: 'operations',
        value: stockMatchRate,
        unit: 'percent',
        metadata: { synced, changed, total: products.length },
      }),
    ]);

    const hasInfrastructureFailure = fetchErrors.length > 0;
    const hasProductErrors = errors > 0;
    const errorRate = products.length > 0 ? errors / products.length : 0;
    const hasCriticalErrorRate = errorRate > 0.2;
    const actionStatus = hasInfrastructureFailure ? 'failed' : 'completed';

    if (actionId) {
      await updateAIAction(actionId, {
        status: actionStatus,
        resultData: {
          totalProducts: products.length,
          synced,
          changed,
          errors,
          errorRate: Math.round(errorRate * 100),
          fetchErrors: hasInfrastructureFailure ? fetchErrors : undefined,
          changes: appliedChanges,
          metrics: summary.metrics,
          infrastructureFailure: hasInfrastructureFailure,
          criticalErrorRate: hasCriticalErrorRate,
        },
        ...(hasInfrastructureFailure && { 
          errorMessage: `Sync incomplete: ${fetchErrors.length} batch fetch errors. ${fetchErrors.join('; ')}` 
        }),
      });
    }

    if (hasInfrastructureFailure) {
      (summary as any).fetchErrors = fetchErrors;
      (summary as any).infrastructureFailure = true;
    }
    if (hasCriticalErrorRate) {
      (summary as any).criticalErrorRate = true;
      (summary as any).errorRate = Math.round(errorRate * 100);
    }

    return summary;
  } catch (e: any) {
    if (actionId) {
      await updateAIAction(actionId, {
        status: 'failed',
        errorMessage: e?.message || 'Unknown error',
      });
    }
    throw e;
  }
}

async function syncSingleProduct(
  admin: any,
  product: any
): Promise<SyncResult> {
  const cjProductId = product.metadata?.cj_product_id;
  const changes: SyncChange[] = [];

  const result: SyncResult = {
    productId: product.id,
    productTitle: product.title,
    cjProductId,
    changes,
    status: 'synced',
  };

  try {
    const cjResult = await withRetry(
      () => queryProductByPidOrKeyword({ pid: cjProductId }),
      { maxRetries: 2, delayMs: 1000 }
    );
    const cjProducts = cjResult?.data?.content || cjResult?.data?.list || [];
    
    if (cjProducts.length === 0) {
      result.status = 'error';
      result.error = 'Product not found in CJ';
      return result;
    }

    const mapped = mapCjItemToProductLike(cjProducts[0]);
    if (!mapped) {
      result.status = 'error';
      result.error = 'Failed to map CJ product';
      return result;
    }

    const totalCjStock = mapped.variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
    const adjustedStock = Math.max(0, totalCjStock - SAFETY_BUFFER);
    const currentStock = product.stock ?? 0;

    if (adjustedStock !== currentStock) {
      const shouldAutoApply = adjustedStock === 0 || currentStock === 0;
      const currentActive = product.active !== false;
      const newActive = adjustedStock > 0;
      
      if (shouldAutoApply) {
        await admin
          .from('products')
          .update({ 
            stock: adjustedStock,
            active: newActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', product.id);
      }

      const { data: syncChangeData } = await admin.from('daily_sync_changes').insert({
        shopixo_product_id: product.id,
        cj_product_id: cjProductId,
        change_type: adjustedStock === 0 ? 'stock_out' : 'stock_change',
        field_changed: 'stock',
        old_value: String(currentStock),
        new_value: String(adjustedStock),
        status: shouldAutoApply ? 'applied' : 'pending',
        sync_date: new Date().toISOString().split('T')[0],
        applied_at: shouldAutoApply ? new Date().toISOString() : null,
      }).select('id').single();

      const syncChangeId = syncChangeData?.id;

      changes.push({
        field: 'stock',
        oldValue: currentStock,
        newValue: adjustedStock,
        autoApplied: shouldAutoApply,
        syncChangeId,
      });

      if (currentActive !== newActive) {
        changes.push({
          field: 'active',
          oldValue: currentActive,
          newValue: newActive,
          autoApplied: shouldAutoApply,
          syncChangeId,
        });
      }
    }

    const avgCostUsd = mapped.variants.length > 0
      ? mapped.variants.reduce((sum: number, v: any) => sum + (v.price || 0), 0) / mapped.variants.length
      : 0;

    const lastKnownCost = product.metadata?.cost_usd || 0;
    if (avgCostUsd > 0 && Math.abs(avgCostUsd - lastKnownCost) > 0.5) {
      const { data: priceChangeData } = await admin.from('daily_sync_changes').insert({
        shopixo_product_id: product.id,
        cj_product_id: cjProductId,
        change_type: avgCostUsd > lastKnownCost ? 'price_increase' : 'price_decrease',
        field_changed: 'cost_price',
        old_value: String(lastKnownCost.toFixed(2)),
        new_value: String(avgCostUsd.toFixed(2)),
        status: 'pending',
        sync_date: new Date().toISOString().split('T')[0],
      }).select('id').single();

      changes.push({
        field: 'cost_price',
        oldValue: lastKnownCost,
        newValue: avgCostUsd,
        autoApplied: false,
        syncChangeId: priceChangeData?.id,
      });
    }

    if (changes.length > 0) {
      result.status = 'changed';
    }

    return result;
  } catch (e: any) {
    result.status = 'error';
    result.error = e?.message || 'Sync failed';
    return result;
  }
}

export async function checkForPendingChanges(): Promise<{
  total: number;
  priceChanges: number;
  stockChanges: number;
  changes: any[];
}> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { total: 0, priceChanges: 0, stockChanges: 0, changes: [] };
  }

  try {
    const { data: changes, error } = await admin
      .from('daily_sync_changes')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !changes) {
      return { total: 0, priceChanges: 0, stockChanges: 0, changes: [] };
    }

    return {
      total: changes.length,
      priceChanges: changes.filter(c => c.field_changed === 'price' || c.field_changed === 'cost_price').length,
      stockChanges: changes.filter(c => c.field_changed === 'stock').length,
      changes,
    };
  } catch (e: any) {
    console.error('[Sync Agent] Error checking pending changes:', e?.message);
    return { total: 0, priceChanges: 0, stockChanges: 0, changes: [] };
  }
}

export async function applySafeChanges(): Promise<{
  applied: number;
  skipped: number;
}> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { applied: 0, skipped: 0 };
  }

  const actionId = await logAIAction({
    actionType: 'apply_safe_changes',
    agentName: 'operations',
    explanation: 'Auto-applying safe sync changes (stock updates)',
    severity: 'low',
    canRollback: true,
  });

  try {
    const { data: changes } = await admin
      .from('daily_sync_changes')
      .select('*, products:shopixo_product_id(id, stock, price, active)')
      .eq('status', 'pending')
      .limit(100);

    if (!changes || changes.length === 0) {
      if (actionId) {
        await updateAIAction(actionId, {
          status: 'completed',
          resultData: { applied: 0, skipped: 0, message: 'No pending changes' },
        });
      }
      return { applied: 0, skipped: 0 };
    }

    let applied = 0;
    let skipped = 0;
    const appliedChanges: Array<{ productId: number; field: string; oldValue: any; newValue: any; syncChangeId?: number }> = [];

    for (const change of changes) {
      const isSafe = change.change_type === 'stock_out' || 
                     change.change_type === 'stock_restored' ||
                     (change.change_type === 'stock_change' && Math.abs(Number(change.new_value) - Number(change.old_value)) <= 10);

      if (isSafe) {
        if (change.field_changed === 'stock') {
          const oldStock = Number(change.old_value);
          const newStock = Number(change.new_value);
          const product = change.products;
          const oldActive = product?.active !== false;
          const newActive = newStock > 0;

          await admin
            .from('products')
            .update({ 
              stock: newStock,
              active: newActive,
              updated_at: new Date().toISOString(),
            })
            .eq('id', change.shopixo_product_id);

          appliedChanges.push({
            productId: change.shopixo_product_id,
            field: 'stock',
            oldValue: oldStock,
            newValue: newStock,
            syncChangeId: change.id,
          });

          if (oldActive !== newActive) {
            appliedChanges.push({
              productId: change.shopixo_product_id,
              field: 'active',
              oldValue: oldActive,
              newValue: newActive,
              syncChangeId: change.id,
            });
          }
        }

        await admin
          .from('daily_sync_changes')
          .update({ status: 'applied', applied_at: new Date().toISOString() })
          .eq('id', change.id);
        applied++;
      } else {
        skipped++;
      }
    }

    if (actionId) {
      await updateAIAction(actionId, {
        status: 'completed',
        resultData: { applied, skipped, changes: appliedChanges },
      });
    }

    return { applied, skipped };
  } catch (e: any) {
    if (actionId) {
      await updateAIAction(actionId, {
        status: 'failed',
        errorMessage: e?.message || 'Unknown error',
      });
    }
    return { applied: 0, skipped: 0 };
  }
}

export interface ReconciliationResult {
  totalChecked: number;
  matched: number;
  mismatched: number;
  notFoundInCJ: number;
  accuracy: number;
  discrepancies: Array<{
    productId: number;
    productTitle: string;
    cjProductId: string;
    field: string;
    localValue: any;
    cjValue: any;
  }>;
}

export async function runReconciliationCheck(limit: number = 50): Promise<ReconciliationResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      totalChecked: 0,
      matched: 0,
      mismatched: 0,
      notFoundInCJ: 0,
      accuracy: 0,
      discrepancies: [],
    };
  }

  const actionId = await logAIAction({
    actionType: 'reconciliation_check',
    agentName: 'operations',
    explanation: `Verifying Supabase data matches CJ catalog (${limit} products)`,
    severity: 'info',
  });

  try {
    const { data: products, error } = await admin
      .from('products')
      .select('id, title, price, stock, active, metadata')
      .not('metadata->cj_product_id', 'is', null)
      .order('id', { ascending: true })
      .limit(limit);

    if (error || !products) {
      throw new Error('Failed to fetch products for reconciliation');
    }

    let matched = 0;
    let mismatched = 0;
    let notFoundInCJ = 0;
    let apiErrors = 0;
    const discrepancies: ReconciliationResult['discrepancies'] = [];

    const RECONCILIATION_DELAY_MS = 200;
    let checkedCount = 0;

    for (const product of products) {
      const cjProductId = product.metadata?.cj_product_id;
      if (!cjProductId) continue;

      if (checkedCount > 0 && checkedCount % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, RECONCILIATION_DELAY_MS * 5));
      }

      try {
        const cjResult = await withRetry(
          () => queryProductByPidOrKeyword({ pid: cjProductId }),
          { maxRetries: 2, delayMs: 1000 }
        );
        checkedCount++;
        const cjProducts = cjResult?.data?.content || cjResult?.data?.list || [];

        if (cjProducts.length === 0) {
          notFoundInCJ++;
          discrepancies.push({
            productId: product.id,
            productTitle: product.title,
            cjProductId,
            field: 'product',
            localValue: 'exists',
            cjValue: 'not found',
          });
          continue;
        }

        const mapped = mapCjItemToProductLike(cjProducts[0]);
        if (!mapped) {
          notFoundInCJ++;
          continue;
        }

        const totalCjStock = mapped.variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
        const adjustedCjStock = Math.max(0, totalCjStock - SAFETY_BUFFER);
        const localStock = product.stock ?? 0;

        let hasDiscrepancy = false;

        if (Math.abs(adjustedCjStock - localStock) > 5) {
          hasDiscrepancy = true;
          discrepancies.push({
            productId: product.id,
            productTitle: product.title,
            cjProductId,
            field: 'stock',
            localValue: localStock,
            cjValue: adjustedCjStock,
          });
        }

        const cjCost = mapped.variants.length > 0
          ? mapped.variants.reduce((sum: number, v: any) => sum + (v.price || 0), 0) / mapped.variants.length
          : 0;
        const localCost = product.metadata?.cost_usd || product.metadata?.cj_sell_price || 0;

        if (cjCost > 0 && localCost > 0 && Math.abs(cjCost - localCost) > 1) {
          hasDiscrepancy = true;
          discrepancies.push({
            productId: product.id,
            productTitle: product.title,
            cjProductId,
            field: 'cost_price',
            localValue: localCost,
            cjValue: cjCost,
          });
        }

        if (hasDiscrepancy) {
          mismatched++;
        } else {
          matched++;
        }
      } catch (e: any) {
        apiErrors++;
        console.error(`[Reconciliation] Failed to check product ${product.id}: ${e?.message}`);
      }
    }

    const totalChecked = products.length;
    const accuracy = totalChecked > 0 ? Math.round((matched / totalChecked) * 100) : 0;

    const result: ReconciliationResult = {
      totalChecked,
      matched,
      mismatched,
      notFoundInCJ,
      accuracy,
      discrepancies: discrepancies.slice(0, 50),
    };

    await recordMetric({
      metricType: 'reconciliation_accuracy',
      agentName: 'operations',
      value: accuracy,
      unit: 'percent',
      metadata: { 
        totalChecked, 
        matched, 
        mismatched, 
        notFoundInCJ,
        apiErrors,
      },
    });

    if (actionId) {
      await updateAIAction(actionId, {
        status: apiErrors > totalChecked / 2 ? 'failed' : 'completed',
        resultData: {
          totalChecked,
          matched,
          mismatched,
          notFoundInCJ,
          apiErrors,
          accuracy,
          discrepancyCount: discrepancies.length,
        },
        ...(apiErrors > 0 && { errorMessage: `${apiErrors} API errors during reconciliation` }),
      });
    }

    return result;
  } catch (e: any) {
    if (actionId) {
      await updateAIAction(actionId, {
        status: 'failed',
        errorMessage: e?.message || 'Unknown error',
      });
    }
    throw e;
  }
}
