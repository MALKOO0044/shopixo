import { NextRequest, NextResponse } from 'next/server';
import { analyzePricing, applyPriceRecommendation } from '@/lib/ai/pricing-agent';
import { isAdminUser } from '@/lib/auth/admin-check';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { isAdmin } = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const analysis = await analyzePricing();
    
    return NextResponse.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('[AI Pricing] Error:', e?.message);
    return NextResponse.json(
      { success: false, error: e?.message || 'Pricing analysis failed' },
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
    const { productId, newPrice } = body;

    if (!productId || !newPrice) {
      return NextResponse.json(
        { success: false, error: 'Missing productId or newPrice' },
        { status: 400 }
      );
    }

    const result = await applyPriceRecommendation(productId, newPrice);
    
    return NextResponse.json({
      success: result,
      message: result ? 'Price updated successfully' : 'Failed to update price',
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('[AI Pricing] Error:', e?.message);
    return NextResponse.json(
      { success: false, error: e?.message || 'Price update failed' },
      { status: 500 }
    );
  }
}
