import { createClient } from "@supabase/supabase-js";
import { logAIAction, updateAIAction } from "./action-logger";
import { recordMetric } from "./metrics-tracker";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export interface ProductHealthData {
  productId: number;
  title: string;
  slug: string;
  cjProductId: string | null;
  healthScore: number;
  dataQualityScore: number;
  profitabilityScore: number;
  availabilityScore: number;
  issues: HealthIssue[];
  recommendations: string[];
  stock: number;
  price: number;
  originalPrice: number | null;
  active: boolean;
  imageCount: number;
  hasVariants: boolean;
  variantCount: number;
  lastSyncedAt: Date | null;
}

export interface HealthIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  field?: string;
}

export interface InventoryStats {
  totalProducts: number;
  activeProducts: number;
  inStockProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  healthyProducts: number;
  warningProducts: number;
  criticalProducts: number;
  averageHealthScore: number;
  totalIssues: number;
}

export async function analyzeProductHealth(productId: number): Promise<ProductHealthData | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  try {
    const { data: product, error } = await admin
      .from('products')
      .select(`
        id, title, slug, price, active, stock, images,
        created_at, updated_at,
        metadata
      `)
      .eq('id', productId)
      .single();

    if (error || !product) return null;

    const { data: variants } = await admin
      .from('product_variants')
      .select('id, stock, price')
      .eq('product_id', productId);

    const issues: HealthIssue[] = [];
    const recommendations: string[] = [];
    let dataQualityScore = 100;
    let profitabilityScore = 100;
    let availabilityScore = 100;

    const cjProductId = product.metadata?.cj_product_id || null;
    const images = product.images || [];
    const imageCount = Array.isArray(images) ? images.length : 0;
    const originalPrice = product.metadata?.original_price || null;
    const variantCount = variants?.length || 0;

    if (!product.title || product.title.length < 10) {
      issues.push({ type: 'data', severity: 'medium', message: 'Product title is too short', field: 'title' });
      dataQualityScore -= 15;
    }

    if (imageCount === 0) {
      issues.push({ type: 'data', severity: 'high', message: 'No product images', field: 'images' });
      dataQualityScore -= 25;
      recommendations.push('Add at least 3 product images for better conversion');
    } else if (imageCount < 3) {
      issues.push({ type: 'data', severity: 'low', message: 'Less than 3 images', field: 'images' });
      dataQualityScore -= 10;
    }

    if (!product.price || product.price <= 0) {
      issues.push({ type: 'pricing', severity: 'critical', message: 'Invalid price', field: 'price' });
      profitabilityScore -= 50;
    }

    if (originalPrice && product.price) {
      const margin = ((product.price - originalPrice) / product.price) * 100;
      if (margin < 10) {
        issues.push({ type: 'pricing', severity: 'medium', message: `Low profit margin: ${margin.toFixed(1)}%`, field: 'margin' });
        profitabilityScore -= 20;
        recommendations.push('Consider increasing price to improve profit margin');
      } else if (margin < 20) {
        profitabilityScore -= 10;
      }
    }

    const stock = product.stock || 0;
    if (stock === 0) {
      issues.push({ type: 'inventory', severity: 'critical', message: 'Out of stock', field: 'stock' });
      availabilityScore -= 50;
      recommendations.push('Product is out of stock - consider deactivating or restocking');
    } else if (stock <= 5) {
      issues.push({ type: 'inventory', severity: 'high', message: `Low stock: ${stock} units`, field: 'stock' });
      availabilityScore -= 25;
      recommendations.push('Stock is running low - check CJ inventory');
    } else if (stock <= 10) {
      issues.push({ type: 'inventory', severity: 'medium', message: `Stock below 10: ${stock} units`, field: 'stock' });
      availabilityScore -= 10;
    }

    if (!product.active) {
      issues.push({ type: 'status', severity: 'low', message: 'Product is inactive', field: 'active' });
    }

    if (cjProductId) {
      const lastSync = product.metadata?.last_synced_at;
      if (!lastSync) {
        issues.push({ type: 'sync', severity: 'medium', message: 'Never synced with CJ', field: 'sync' });
        dataQualityScore -= 10;
      } else {
        const daysSinceSync = (Date.now() - new Date(lastSync).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceSync > 7) {
          issues.push({ type: 'sync', severity: 'low', message: `Not synced in ${Math.floor(daysSinceSync)} days`, field: 'sync' });
          recommendations.push('Run a sync to check for price/stock updates from CJ');
        }
      }
    }

    dataQualityScore = Math.max(0, Math.min(100, dataQualityScore));
    profitabilityScore = Math.max(0, Math.min(100, profitabilityScore));
    availabilityScore = Math.max(0, Math.min(100, availabilityScore));

    const healthScore = Math.round((dataQualityScore * 0.3) + (profitabilityScore * 0.3) + (availabilityScore * 0.4));

    return {
      productId: product.id,
      title: product.title,
      slug: product.slug,
      cjProductId,
      healthScore,
      dataQualityScore,
      profitabilityScore,
      availabilityScore,
      issues,
      recommendations,
      stock,
      price: product.price,
      originalPrice,
      active: product.active,
      imageCount,
      hasVariants: variantCount > 0,
      variantCount,
      lastSyncedAt: product.metadata?.last_synced_at ? new Date(product.metadata.last_synced_at) : null,
    };
  } catch (e: any) {
    console.error('[Inventory Agent] Error analyzing product:', e?.message);
    return null;
  }
}

export async function runInventoryHealthCheck(): Promise<{
  stats: InventoryStats;
  products: ProductHealthData[];
}> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      stats: {
        totalProducts: 0,
        activeProducts: 0,
        inStockProducts: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0,
        healthyProducts: 0,
        warningProducts: 0,
        criticalProducts: 0,
        averageHealthScore: 0,
        totalIssues: 0,
      },
      products: [],
    };
  }

  const actionId = await logAIAction({
    actionType: 'inventory_health_check',
    agentName: 'inventory',
    explanation: 'Running comprehensive inventory health analysis',
    severity: 'info',
  });

  try {
    const { data: products, error } = await admin
      .from('products')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !products) {
      throw new Error('Failed to fetch products');
    }

    const healthResults: ProductHealthData[] = [];
    for (const p of products) {
      const health = await analyzeProductHealth(p.id);
      if (health) {
        healthResults.push(health);

        await admin
          .from('product_health')
          .upsert({
            product_id: health.productId,
            health_score: health.healthScore,
            data_quality_score: health.dataQualityScore,
            profitability_score: health.profitabilityScore,
            availability_score: health.availabilityScore,
            issues: health.issues,
            recommendations: health.recommendations,
            last_checked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'product_id' });
      }
    }

    const stats: InventoryStats = {
      totalProducts: healthResults.length,
      activeProducts: healthResults.filter(p => p.active).length,
      inStockProducts: healthResults.filter(p => p.stock > 10).length,
      lowStockProducts: healthResults.filter(p => p.stock > 0 && p.stock <= 10).length,
      outOfStockProducts: healthResults.filter(p => p.stock === 0).length,
      healthyProducts: healthResults.filter(p => p.healthScore >= 80).length,
      warningProducts: healthResults.filter(p => p.healthScore >= 50 && p.healthScore < 80).length,
      criticalProducts: healthResults.filter(p => p.healthScore < 50).length,
      averageHealthScore: healthResults.length > 0 
        ? Math.round(healthResults.reduce((sum, p) => sum + p.healthScore, 0) / healthResults.length)
        : 0,
      totalIssues: healthResults.reduce((sum, p) => sum + p.issues.length, 0),
    };

    await Promise.all([
      recordMetric({
        metricType: 'inventory_health',
        agentName: 'inventory',
        value: stats.averageHealthScore,
        unit: 'percent',
        metadata: { 
          healthy: stats.healthyProducts, 
          warning: stats.warningProducts, 
          critical: stats.criticalProducts,
        },
      }),
      recordMetric({
        metricType: 'out_of_stock_rate',
        agentName: 'inventory',
        value: stats.totalProducts > 0 
          ? Math.round((stats.outOfStockProducts / stats.totalProducts) * 100) 
          : 0,
        unit: 'percent',
        metadata: { outOfStock: stats.outOfStockProducts, total: stats.totalProducts },
      }),
      recordMetric({
        metricType: 'low_stock_rate',
        agentName: 'inventory',
        value: stats.totalProducts > 0 
          ? Math.round((stats.lowStockProducts / stats.totalProducts) * 100) 
          : 0,
        unit: 'percent',
        metadata: { lowStock: stats.lowStockProducts, total: stats.totalProducts },
      }),
    ]);

    if (actionId) {
      await updateAIAction(actionId, {
        status: 'completed',
        resultData: {
          productsAnalyzed: healthResults.length,
          stats,
        },
      });
    }

    return { stats, products: healthResults };
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

export async function getInventoryAlerts(): Promise<{
  critical: ProductHealthData[];
  warning: ProductHealthData[];
  lowStock: ProductHealthData[];
  outOfStock: ProductHealthData[];
}> {
  const { products } = await runInventoryHealthCheck();

  return {
    critical: products.filter(p => p.healthScore < 50).slice(0, 10),
    warning: products.filter(p => p.healthScore >= 50 && p.healthScore < 80).slice(0, 10),
    lowStock: products.filter(p => p.stock > 0 && p.stock <= 10).slice(0, 10),
    outOfStock: products.filter(p => p.stock === 0).slice(0, 10),
  };
}
