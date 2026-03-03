import { createClient } from "@supabase/supabase-js";
import { logAIAction, updateAIAction } from "./action-logger";
import { recordMetric } from "./metrics-tracker";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export interface PricingRecommendation {
  productId: number;
  currentPrice: number;
  recommendedPrice: number;
  costPrice: number;
  currentMargin: number;
  recommendedMargin: number;
  reason: string;
  confidence: number;
}

export interface PricingAnalysis {
  products: PricingRecommendation[];
  lowMarginCount: number;
  optimalMarginCount: number;
  highMarginCount: number;
  averageMargin: number;
}

const TARGET_MARGIN_MIN = 20;
const TARGET_MARGIN_OPTIMAL = 35;
const TARGET_MARGIN_MAX = 60;

export async function analyzePricing(): Promise<PricingAnalysis> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      products: [],
      lowMarginCount: 0,
      optimalMarginCount: 0,
      highMarginCount: 0,
      averageMargin: 0,
    };
  }

  const actionId = await logAIAction({
    actionType: 'pricing_analysis',
    agentName: 'pricing',
    explanation: 'Analyzing product pricing and margins',
    severity: 'info',
  });

  try {
    const { data: products, error } = await admin
      .from('products')
      .select('id, title, price, metadata')
      .not('metadata->cj_product_id', 'is', null)
      .limit(100);

    if (error || !products) {
      throw new Error('Failed to fetch products');
    }

    const recommendations: PricingRecommendation[] = [];
    let totalMargin = 0;
    let marginCount = 0;

    for (const product of products) {
      const costPrice = product.metadata?.cj_sell_price || product.metadata?.original_price || 0;
      const currentPrice = product.price || 0;

      if (costPrice <= 0 || currentPrice <= 0) continue;

      const currentMargin = ((currentPrice - costPrice) / currentPrice) * 100;
      totalMargin += currentMargin;
      marginCount++;

      let recommendedPrice = currentPrice;
      let reason = '';
      let confidence = 0.5;

      if (currentMargin < TARGET_MARGIN_MIN) {
        recommendedPrice = costPrice / (1 - TARGET_MARGIN_OPTIMAL / 100);
        reason = `Margin too low (${currentMargin.toFixed(1)}%). Recommend increasing to ${TARGET_MARGIN_OPTIMAL}%`;
        confidence = 0.85;
      } else if (currentMargin > TARGET_MARGIN_MAX) {
        reason = `High margin (${currentMargin.toFixed(1)}%). Price may be too high for market`;
        confidence = 0.6;
      } else if (currentMargin >= TARGET_MARGIN_MIN && currentMargin < TARGET_MARGIN_OPTIMAL) {
        recommendedPrice = costPrice / (1 - TARGET_MARGIN_OPTIMAL / 100);
        reason = `Good margin but could optimize to ${TARGET_MARGIN_OPTIMAL}%`;
        confidence = 0.7;
      } else {
        reason = 'Optimal pricing';
        confidence = 0.9;
      }

      const recommendedMargin = recommendedPrice > 0 
        ? ((recommendedPrice - costPrice) / recommendedPrice) * 100 
        : currentMargin;

      recommendations.push({
        productId: product.id,
        currentPrice,
        recommendedPrice: Math.round(recommendedPrice * 100) / 100,
        costPrice,
        currentMargin: Math.round(currentMargin * 10) / 10,
        recommendedMargin: Math.round(recommendedMargin * 10) / 10,
        reason,
        confidence,
      });
    }

    const analysis: PricingAnalysis = {
      products: recommendations.sort((a, b) => a.currentMargin - b.currentMargin),
      lowMarginCount: recommendations.filter(r => r.currentMargin < TARGET_MARGIN_MIN).length,
      optimalMarginCount: recommendations.filter(r => r.currentMargin >= TARGET_MARGIN_MIN && r.currentMargin <= TARGET_MARGIN_OPTIMAL).length,
      highMarginCount: recommendations.filter(r => r.currentMargin > TARGET_MARGIN_MAX).length,
      averageMargin: marginCount > 0 ? Math.round((totalMargin / marginCount) * 10) / 10 : 0,
    };

    await Promise.all([
      recordMetric({
        metricType: 'average_margin',
        agentName: 'pricing',
        value: analysis.averageMargin,
        unit: 'percent',
        metadata: { 
          productsAnalyzed: recommendations.length,
          lowMargin: analysis.lowMarginCount,
          optimal: analysis.optimalMarginCount,
          highMargin: analysis.highMarginCount,
        },
      }),
      recordMetric({
        metricType: 'low_margin_rate',
        agentName: 'pricing',
        value: recommendations.length > 0 
          ? Math.round((analysis.lowMarginCount / recommendations.length) * 100) 
          : 0,
        unit: 'percent',
        metadata: { lowMargin: analysis.lowMarginCount, total: recommendations.length },
      }),
    ]);

    if (actionId) {
      await updateAIAction(actionId, {
        status: 'completed',
        resultData: {
          productsAnalyzed: recommendations.length,
          lowMarginCount: analysis.lowMarginCount,
          averageMargin: analysis.averageMargin,
        },
      });
    }

    return analysis;
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

export async function applyPriceRecommendation(
  productId: number, 
  newPrice: number
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const actionId = await logAIAction({
    actionType: 'apply_price_change',
    agentName: 'pricing',
    entityType: 'product',
    entityId: String(productId),
    actionData: { newPrice },
    explanation: `Updating product price to $${newPrice.toFixed(2)}`,
    severity: 'medium',
    canRollback: true,
    confidenceScore: 0.85,
  });

  try {
    const { data: product } = await admin
      .from('products')
      .select('price')
      .eq('id', productId)
      .single();

    const oldPrice = product?.price;

    const { error } = await admin
      .from('products')
      .update({ 
        price: newPrice,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);

    if (error) {
      throw new Error(error.message);
    }

    if (actionId) {
      await updateAIAction(actionId, {
        status: 'completed',
        resultData: { oldPrice, newPrice },
      });
    }

    return true;
  } catch (e: any) {
    if (actionId) {
      await updateAIAction(actionId, {
        status: 'failed',
        errorMessage: e?.message || 'Unknown error',
      });
    }
    return false;
  }
}
