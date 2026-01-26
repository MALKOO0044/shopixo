import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import Link from "next/link";
import type { Route } from "next";
import { 
  Brain, Activity, HeartPulse, Zap, Shield, 
  CheckCircle, AlertTriangle, XCircle, Clock,
  TrendingUp, Package, ShoppingCart, RefreshCw, BarChart3
} from "lucide-react";

export const metadata = {
  title: "AI Command Center - Shopixo Admin",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function getAIStats() {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  try {
    const [
      { data: actions },
      { data: products },
      { data: orders },
      { data: healthData }
    ] = await Promise.all([
      admin.from('ai_actions').select('id, status, agent_name, created_at').order('created_at', { ascending: false }).limit(100),
      admin.from('products').select('id, active, stock').not('metadata->cj_product_id', 'is', null),
      admin.from('orders').select('id, status, created_at').order('created_at', { ascending: false }).limit(50),
      admin.from('product_health').select('health_score, issues').limit(100),
    ]);

    const recentActions = actions || [];
    const allProducts = products || [];
    const recentOrders = orders || [];
    const healthScores = healthData || [];

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const actionsToday = recentActions.filter(a => new Date(a.created_at) >= todayStart).length;
    const completedActions = recentActions.filter(a => a.status === 'completed').length;
    const failedActions = recentActions.filter(a => a.status === 'failed').length;
    const pendingActions = recentActions.filter(a => a.status === 'pending' || a.status === 'running').length;

    const avgHealthScore = healthScores.length > 0
      ? Math.round(healthScores.reduce((sum, h) => sum + (h.health_score || 0), 0) / healthScores.length)
      : 0;

    const totalIssues = healthScores.reduce((sum, h) => {
      const issues = h.issues || [];
      return sum + (Array.isArray(issues) ? issues.length : 0);
    }, 0);

    const criticalProducts = healthScores.filter(h => (h.health_score || 0) < 50).length;
    const warningProducts = healthScores.filter(h => (h.health_score || 0) >= 50 && (h.health_score || 0) < 80).length;

    const lowStockProducts = allProducts.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 10).length;
    const outOfStockProducts = allProducts.filter(p => (p.stock || 0) === 0).length;

    const pendingOrders = recentOrders.filter(o => o.status === 'pending' || o.status === 'paid').length;

    return {
      actionsToday,
      completedActions,
      failedActions,
      pendingActions,
      avgHealthScore,
      totalIssues,
      criticalProducts,
      warningProducts,
      lowStockProducts,
      outOfStockProducts,
      pendingOrders,
      totalProducts: allProducts.length,
      activeProducts: allProducts.filter(p => p.active).length,
      recentActions: recentActions.slice(0, 5),
    };
  } catch (e: any) {
    console.error('[AI Stats] Error:', e?.message);
    return null;
  }
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
    completed: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
    failed: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
    running: { bg: 'bg-blue-100', text: 'text-blue-700', icon: RefreshCw },
  };
  const style = styles[status] || styles.pending;
  const Icon = style.icon;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

function AgentBadge({ agent }: { agent: string }) {
  const colors: Record<string, string> = {
    inventory: 'bg-purple-100 text-purple-700',
    merchandising: 'bg-blue-100 text-blue-700',
    operations: 'bg-amber-100 text-amber-700',
    pricing: 'bg-green-100 text-green-700',
    security: 'bg-red-100 text-red-700',
    intelligence: 'bg-indigo-100 text-indigo-700',
  };
  
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[agent] || 'bg-gray-100 text-gray-700'}`}>
      {agent}
    </span>
  );
}

export default async function AICommandCenter() {
  const stats = await getAIStats();

  if (!stats) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Unable to load AI Command Center. Please check your database connection.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="h-7 w-7 text-purple-600" />
            AI Command Center
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time overview of all AI-powered automation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            System Active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Activity className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.actionsToday}</p>
              <p className="text-xs text-gray-500">Actions Today</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completedActions}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingActions}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.failedActions}</p>
              <p className="text-xs text-gray-500">Failed</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Link href={"/admin/ai/inventory" as Route} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-50 rounded-lg">
                <HeartPulse className="h-5 w-5 text-rose-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Inventory Health</h3>
            </div>
            <div className={`text-2xl font-bold ${stats.avgHealthScore >= 80 ? 'text-green-600' : stats.avgHealthScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
              {stats.avgHealthScore}%
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Critical Issues</span>
              <span className="font-medium text-red-600">{stats.criticalProducts}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Warnings</span>
              <span className="font-medium text-amber-600">{stats.warningProducts}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Low Stock</span>
              <span className="font-medium text-orange-600">{stats.lowStockProducts}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Out of Stock</span>
              <span className="font-medium text-red-600">{stats.outOfStockProducts}</span>
            </div>
          </div>
        </Link>

        <Link href={"/admin/ai/operations" as Route} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Zap className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Operations</h3>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Pending Orders</span>
              <span className="font-medium text-blue-600">{stats.pendingOrders}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Active Products</span>
              <span className="font-medium text-green-600">{stats.activeProducts}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Total Products</span>
              <span className="font-medium text-gray-700">{stats.totalProducts}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Total Issues</span>
              <span className="font-medium text-orange-600">{stats.totalIssues}</span>
            </div>
          </div>
        </Link>

        <Link href={"/admin/ai/security" as Route} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Security</h3>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              stats.failedActions === 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {stats.failedActions === 0 ? 'Healthy' : 'Review Needed'}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Failed Actions</span>
              <span className={`font-medium ${stats.failedActions === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                {stats.failedActions}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Completed Actions</span>
              <span className="font-medium text-green-600">{stats.completedActions}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Pending Actions</span>
              <span className="font-medium text-gray-700">{stats.pendingActions}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Total Today</span>
              <span className="font-medium text-purple-600">{stats.actionsToday}</span>
            </div>
          </div>
        </Link>
      </div>

      <Link href={"/admin/ai/metrics" as Route} className="block bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-5 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Effectiveness Metrics</h3>
              <p className="text-sm text-gray-500">View measurable proof that the AI Command Center is working effectively</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
              View Metrics →
            </span>
          </div>
        </div>
      </Link>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="h-4 w-4 text-purple-600" />
            Recent AI Activity
          </h3>
          <Link href="/admin/ai/activity" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
            View All
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {stats.recentActions.length > 0 ? (
            stats.recentActions.map((action: any) => (
              <div key={action.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AgentBadge agent={action.agent_name} />
                  <span className="text-sm text-gray-700">{action.action_type?.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={action.status} />
                  <span className="text-xs text-gray-400">
                    {new Date(action.created_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No AI actions recorded yet</p>
              <p className="text-sm mt-1">Actions will appear here as the system runs</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
