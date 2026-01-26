import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { 
  HeartPulse, ArrowLeft, AlertTriangle, CheckCircle, 
  XCircle, Package, TrendingDown, RefreshCw
} from "lucide-react";

export const metadata = {
  title: "Inventory Health - Shopixo Admin",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function getInventoryHealth() {
  const admin = getSupabaseAdmin();
  if (!admin) return { products: [], stats: null };

  try {
    const { data: products, error } = await admin
      .from('products')
      .select(`
        id, title, slug, price, active, stock, images,
        metadata
      `)
      .not('metadata->cj_product_id', 'is', null)
      .order('stock', { ascending: true })
      .limit(100);

    if (error) {
      console.error('[Inventory Health] Error:', error.message);
      return { products: [], stats: null };
    }

    const analyzed = (products || []).map(product => {
      const issues: any[] = [];
      let healthScore = 100;
      
      const stock = product.stock || 0;
      const images = product.images || [];
      const imageCount = Array.isArray(images) ? images.length : 0;
      const originalPrice = product.metadata?.original_price || 0;
      const margin = originalPrice && product.price ? ((product.price - originalPrice) / product.price) * 100 : 0;

      if (stock === 0) {
        issues.push({ type: 'critical', message: 'Out of stock' });
        healthScore -= 40;
      } else if (stock <= 5) {
        issues.push({ type: 'high', message: `Very low stock: ${stock}` });
        healthScore -= 25;
      } else if (stock <= 10) {
        issues.push({ type: 'medium', message: `Low stock: ${stock}` });
        healthScore -= 10;
      }

      if (imageCount === 0) {
        issues.push({ type: 'high', message: 'No images' });
        healthScore -= 20;
      } else if (imageCount < 3) {
        issues.push({ type: 'low', message: `Only ${imageCount} image(s)` });
        healthScore -= 5;
      }

      if (margin < 10 && margin > 0) {
        issues.push({ type: 'medium', message: `Low margin: ${margin.toFixed(1)}%` });
        healthScore -= 15;
      }

      if (!product.active) {
        issues.push({ type: 'info', message: 'Inactive' });
      }

      healthScore = Math.max(0, Math.min(100, healthScore));

      return {
        ...product,
        healthScore,
        issues,
        imageCount,
        margin: margin.toFixed(1),
        cjProductId: product.metadata?.cj_product_id,
      };
    });

    const stats = {
      total: analyzed.length,
      healthy: analyzed.filter(p => p.healthScore >= 80).length,
      warning: analyzed.filter(p => p.healthScore >= 50 && p.healthScore < 80).length,
      critical: analyzed.filter(p => p.healthScore < 50).length,
      outOfStock: analyzed.filter(p => p.stock === 0).length,
      lowStock: analyzed.filter(p => p.stock > 0 && p.stock <= 10).length,
      avgHealth: analyzed.length > 0 
        ? Math.round(analyzed.reduce((sum, p) => sum + p.healthScore, 0) / analyzed.length)
        : 0,
    };

    return { products: analyzed, stats };
  } catch (e: any) {
    console.error('[Inventory Health] Error:', e?.message);
    return { products: [], stats: null };
  }
}

function HealthBadge({ score }: { score: number }) {
  let color = 'bg-green-100 text-green-700';
  if (score < 50) color = 'bg-red-100 text-red-700';
  else if (score < 80) color = 'bg-amber-100 text-amber-700';

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-bold ${color}`}>
      {score}%
    </span>
  );
}

function IssueBadge({ type, message }: { type: string; message: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-blue-100 text-blue-700',
    info: 'bg-gray-100 text-gray-700',
  };

  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs ${colors[type] || colors.info}`}>
      {message}
    </span>
  );
}

export default async function InventoryHealthPage() {
  const { products, stats } = await getInventoryHealth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/ai" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <HeartPulse className="h-6 w-6 text-rose-600" />
              Inventory Health
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              AI-powered analysis of product health and inventory status
            </p>
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-6 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stats.avgHealth >= 80 ? 'bg-green-50' : stats.avgHealth >= 50 ? 'bg-amber-50' : 'bg-red-50'}`}>
                <HeartPulse className={`h-5 w-5 ${stats.avgHealth >= 80 ? 'text-green-600' : stats.avgHealth >= 50 ? 'text-amber-600' : 'text-red-600'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.avgHealth}%</p>
                <p className="text-xs text-gray-500">Avg Health</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.healthy}</p>
                <p className="text-xs text-gray-500">Healthy</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.warning}</p>
                <p className="text-xs text-gray-500">Warning</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.critical}</p>
                <p className="text-xs text-gray-500">Critical</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <TrendingDown className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.lowStock}</p>
                <p className="text-xs text-gray-500">Low Stock</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-50 rounded-lg">
                <Package className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.outOfStock}</p>
                <p className="text-xs text-gray-500">Out of Stock</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Product Health Analysis</h3>
          <span className="text-sm text-gray-500">{products.length} products analyzed</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Product</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Health</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Stock</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Price</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Margin</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Issues</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.length > 0 ? (
                products.map((product: any) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.images?.[0] ? (
                          <img 
                            src={product.images[0]} 
                            alt="" 
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{product.title}</p>
                          <p className="text-xs text-gray-500">ID: {product.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <HealthBadge score={product.healthScore} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${product.stock === 0 ? 'text-red-600' : product.stock <= 10 ? 'text-amber-600' : 'text-green-600'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      ${product.price?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${parseFloat(product.margin) < 10 ? 'text-red-600' : parseFloat(product.margin) < 20 ? 'text-amber-600' : 'text-green-600'}`}>
                        {product.margin}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {product.issues.slice(0, 3).map((issue: any, idx: number) => (
                          <IssueBadge key={idx} type={issue.type} message={issue.message} />
                        ))}
                        {product.issues.length > 3 && (
                          <span className="text-xs text-gray-500">+{product.issues.length - 3} more</span>
                        )}
                        {product.issues.length === 0 && (
                          <span className="text-xs text-green-600">No issues</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link 
                        href={`/admin/products/${product.id}/edit`}
                        className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <HeartPulse className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-500">No products to analyze</p>
                    <p className="text-sm text-gray-400 mt-1">Import products from CJ Dropshipping first</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
