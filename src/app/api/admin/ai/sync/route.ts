import { NextRequest, NextResponse } from 'next/server';
import { runAutoSync, checkForPendingChanges, applySafeChanges, runReconciliationCheck } from '@/lib/ai/sync-agent';
import { isAdminUser } from '@/lib/auth/admin-check';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { isAdmin } = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const pending = await checkForPendingChanges();
    
    return NextResponse.json({
      success: true,
      pending,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('[AI Sync] Error:', e?.message);
    return NextResponse.json(
      { success: false, error: e?.message || 'Sync check failed' },
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
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'run';

    if (action === 'apply_safe') {
      const result = await applySafeChanges();
      return NextResponse.json({
        success: true,
        result,
        message: `Applied ${result.applied} safe changes, skipped ${result.skipped}`,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'reconcile') {
      const limit = body.limit || 50;
      const result = await runReconciliationCheck(limit);
      
      const isCritical = result.accuracy < 80;
      const hasWarning = result.accuracy < 95 && result.accuracy >= 80;
      
      if (isCritical) {
        return NextResponse.json({
          success: false,
          result,
          message: `Reconciliation failed: Only ${result.accuracy}% match (threshold: 80%)`,
          error: `Found ${result.discrepancies.length} discrepancies`,
          timestamp: new Date().toISOString(),
        }, { status: 422 });
      }
      
      return NextResponse.json({
        success: true,
        result,
        message: `Checked ${result.totalChecked} products, ${result.accuracy}% match`,
        warning: hasWarning ? `Found ${result.discrepancies.length} discrepancies` : undefined,
        timestamp: new Date().toISOString(),
      });
    }

    const maxProducts = body.maxProducts || 500;
    const summary = await runAutoSync({ maxProducts });
    
    const hasInfrastructureFailure = (summary as any).infrastructureFailure === true;
    const hasCriticalErrorRate = (summary as any).criticalErrorRate === true;
    
    if (hasInfrastructureFailure) {
      return NextResponse.json({
        success: false,
        infrastructureFailure: true,
        summary,
        error: `Sync failed: ${(summary as any).fetchErrors?.join('; ') || 'Database fetch errors'}`,
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }
    
    if (hasCriticalErrorRate) {
      return NextResponse.json({
        success: true,
        warning: `High error rate: ${(summary as any).errorRate}% of products had sync issues`,
        summary,
        timestamp: new Date().toISOString(),
      });
    }
    
    return NextResponse.json({
      success: true,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('[AI Sync] Error:', e?.message);
    return NextResponse.json(
      { success: false, error: e?.message || 'Sync failed' },
      { status: 500 }
    );
  }
}
