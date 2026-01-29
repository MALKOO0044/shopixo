import { NextRequest, NextResponse } from 'next/server';
import { getRecentAIActions, getAIActionStats, rollbackAIAction } from '@/lib/ai/action-logger';
import { isAdminUser } from '@/lib/auth/admin-check';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { isAdmin } = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    const [actions, stats] = await Promise.all([
      getRecentAIActions(limit),
      getAIActionStats(),
    ]);
    
    return NextResponse.json({
      success: true,
      actions,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('[AI Actions] Error:', e?.message);
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to get actions' },
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
    const { action, actionId } = body;

    if (action === 'rollback' && actionId) {
      const result = await rollbackAIAction(actionId);
      return NextResponse.json({
        success: result.success,
        message: result.message,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (e: any) {
    console.error('[AI Actions] Error:', e?.message);
    return NextResponse.json(
      { success: false, error: e?.message || 'Action failed' },
      { status: 500 }
    );
  }
}
