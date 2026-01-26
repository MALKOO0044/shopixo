import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { 
  BarChart3, ArrowLeft, TrendingUp, TrendingDown, Minus,
  Gauge, Clock, Target, Activity, LineChart
} from "lucide-react";

export const metadata = {
  title: "AI Effectiveness Metrics - Shopixo Admin",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function getMetricsData() {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const { data: recentMetrics } = await admin
      .from('ai_metrics')
      .select('*')
      .gte('recorded_at', sevenDaysAgo.toISOString())
      .order('recorded_at', { ascending: false });

    const metrics = recentMetrics || [];

    const getLatestMetric = (type: string) => {
      const found = metrics.find(m => m.metric_type === type);
      return found?.value ? Number(found.value) : 0;
    };

    const getAverageMetric = (type: string, since: Date) => {
      const matching = metrics.filter(m => 
        m.metric_type === type && new Date(m.recorded_at) >= since
      );
      if (matching.length === 0) return 0;
      return matching.reduce((sum, m) => sum + Number(m.value), 0) / matching.length;
    };

    const getTrend = (type: string) => {
      const todayAvg = getAverageMetric(type, oneDayAgo);
      const matching = metrics.filter(m => 
        m.metric_type === type && new Date(m.recorded_at) < oneDayAgo
      );
      if (matching.length === 0) return 0;
      const prevAvg = matching.reduce((sum, m) => sum + Number(m.value), 0) / matching.length;
      return todayAvg - prevAvg;
    };

    const getDailyHistory = (type: string) => {
      const dailyValues: Record<string, number[]> = {};
      for (const m of metrics.filter(m => m.metric_type === type)) {
        const date = new Date(m.recorded_at).toISOString().split('T')[0];
        if (!dailyValues[date]) dailyValues[date] = [];
        dailyValues[date].push(Number(m.value));
      }
      return Object.entries(dailyValues)
        .map(([date, values]) => ({
          date,
          value: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    };

    const { count: totalActions } = await admin
      .from('ai_actions')
      .select('*', { count: 'exact', head: true });

    const { count: completedActions } = await admin
      .from('ai_actions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    const { count: failedActions } = await admin
      .from('ai_actions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed');

    return {
      kpis: {
        syncAccuracy: {
          current: getLatestMetric('sync_accuracy'),
          trend: getTrend('sync_accuracy'),
          history: getDailyHistory('sync_accuracy'),
        },
        averageMargin: {
          current: getLatestMetric('average_margin'),
          trend: getTrend('average_margin'),
          history: getDailyHistory('average_margin'),
        },
        inventoryHealth: {
          current: getLatestMetric('inventory_health'),
          trend: getTrend('inventory_health'),
          history: getDailyHistory('inventory_health'),
        },
        syncLatency: {
          current: getLatestMetric('sync_latency'),
          trend: getTrend('sync_latency'),
          history: getDailyHistory('sync_latency'),
        },
        stockMatchRate: {
          current: getLatestMetric('stock_match_rate'),
          trend: getTrend('stock_match_rate'),
          history: getDailyHistory('stock_match_rate'),
        },
        outOfStockRate: {
          current: getLatestMetric('out_of_stock_rate'),
          trend: getTrend('out_of_stock_rate'),
          history: getDailyHistory('out_of_stock_rate'),
        },
      },
      actionStats: {
        total: totalActions || 0,
        completed: completedActions || 0,
        failed: failedActions || 0,
        successRate: totalActions && totalActions > 0 
          ? Math.round(((completedActions || 0) / totalActions) * 100) 
          : 0,
      },
      recentMetrics: metrics.slice(0, 20),
    };
  } catch (e: any) {
    console.error('[AI Metrics Page] Error:', e?.message);
    return null;
  }
}

function TrendIndicator({ value, inverse = false }: { value: number; inverse?: boolean }) {
  const isPositive = inverse ? value < 0 : value > 0;
  const isNegative = inverse ? value > 0 : value < 0;
  
  if (Math.abs(value) < 0.1) {
    return <Minus className="h-4 w-4 text-gray-400" />;
  }
  
  if (isPositive) {
    return (
      <span className="flex items-center gap-1 text-green-600 text-sm">
        <TrendingUp className="h-4 w-4" />
        +{Math.abs(value).toFixed(1)}
      </span>
    );
  }
  
  return (
    <span className="flex items-center gap-1 text-red-600 text-sm">
      <TrendingDown className="h-4 w-4" />
      -{Math.abs(value).toFixed(1)}
    </span>
  );
}

function MiniChart({ data }: { data: { date: string; value: number }[] }) {
  if (data.length < 2) {
    return <div className="h-12 flex items-center justify-center text-xs text-gray-400">Not enough data</div>;
  }

  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const range = max - min || 1;

  return (
    <div className="flex items-end gap-1 h-12">
      {data.slice(-7).map((d, idx) => (
        <div
          key={idx}
          className="flex-1 bg-purple-200 rounded-t"
          style={{ 
            height: `${Math.max(4, ((d.value - min) / range) * 100)}%`,
            minHeight: '4px',
          }}
          title={`${d.date}: ${d.value}`}
        />
      ))}
    </div>
  );
}

export default async function AIMetricsPage() {
  const data = await getMetricsData();

  if (!data) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/ai" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-purple-600" />
            AI Effectiveness Metrics
          </h1>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 font-medium">Unable to load metrics data</p>
          <p className="text-yellow-700 text-sm mt-1">
            This may be because the database connection is not configured or no AI actions have been run yet.
            Run a sync operation from the AI Command Center to start collecting metrics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/ai" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-purple-600" />
              AI Effectiveness Metrics
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Measurable proof that the AI Command Center is working effectively
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
            data.actionStats.successRate >= 95 ? 'bg-green-100 text-green-700' : 
            data.actionStats.successRate >= 80 ? 'bg-amber-100 text-amber-700' : 
            'bg-red-100 text-red-700'
          }`}>
            <Gauge className="h-4 w-4" />
            {data.actionStats.successRate}% Success Rate
          </span>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-purple-600" />
          Effectiveness Summary
        </h2>
        <div className="grid grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500">Total AI Actions</p>
            <p className="text-3xl font-bold text-gray-900">{data.actionStats.total}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Successful Actions</p>
            <p className="text-3xl font-bold text-green-600">{data.actionStats.completed}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Failed Actions</p>
            <p className="text-3xl font-bold text-red-600">{data.actionStats.failed}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Success Rate</p>
            <p className="text-3xl font-bold text-purple-600">{data.actionStats.successRate}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Target className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Sync Accuracy</span>
            </div>
            <TrendIndicator value={data.kpis.syncAccuracy.trend} />
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-2">
            {data.kpis.syncAccuracy.current}%
          </p>
          <MiniChart data={data.kpis.syncAccuracy.history} />
          <p className="text-xs text-gray-500 mt-2">Products synced without errors</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-50 rounded-lg">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Average Margin</span>
            </div>
            <TrendIndicator value={data.kpis.averageMargin.trend} />
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-2">
            {data.kpis.averageMargin.current}%
          </p>
          <MiniChart data={data.kpis.averageMargin.history} />
          <p className="text-xs text-gray-500 mt-2">Average profit margin across products</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Gauge className="h-4 w-4 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Inventory Health</span>
            </div>
            <TrendIndicator value={data.kpis.inventoryHealth.trend} />
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-2">
            {data.kpis.inventoryHealth.current}%
          </p>
          <MiniChart data={data.kpis.inventoryHealth.history} />
          <p className="text-xs text-gray-500 mt-2">Overall product catalog health</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Sync Latency</span>
            </div>
            <TrendIndicator value={data.kpis.syncLatency.trend} inverse />
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-2">
            {data.kpis.syncLatency.current < 1000 
              ? `${data.kpis.syncLatency.current}ms` 
              : `${(data.kpis.syncLatency.current / 1000).toFixed(1)}s`}
          </p>
          <MiniChart data={data.kpis.syncLatency.history} />
          <p className="text-xs text-gray-500 mt-2">Time to complete sync (lower is better)</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-cyan-50 rounded-lg">
                <LineChart className="h-4 w-4 text-cyan-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Stock Match Rate</span>
            </div>
            <TrendIndicator value={data.kpis.stockMatchRate.trend} />
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-2">
            {data.kpis.stockMatchRate.current}%
          </p>
          <MiniChart data={data.kpis.stockMatchRate.history} />
          <p className="text-xs text-gray-500 mt-2">Products with accurate stock levels</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-50 rounded-lg">
                <TrendingDown className="h-4 w-4 text-red-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Out of Stock Rate</span>
            </div>
            <TrendIndicator value={data.kpis.outOfStockRate.trend} inverse />
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-2">
            {data.kpis.outOfStockRate.current}%
          </p>
          <MiniChart data={data.kpis.outOfStockRate.history} />
          <p className="text-xs text-gray-500 mt-2">Products out of stock (lower is better)</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="h-4 w-4 text-gray-600" />
            Recent Metric Recordings
          </h3>
          <span className="text-sm text-gray-500">{data.recentMetrics.length} records</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Time</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Metric</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Agent</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Value</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.recentMetrics.length > 0 ? (
                data.recentMetrics.map((metric: any) => (
                  <tr key={metric.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(metric.recorded_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900">
                        {metric.metric_type?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">
                        {metric.agent_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {Number(metric.value).toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {metric.unit}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-500">No metrics recorded yet</p>
                    <p className="text-sm text-gray-400 mt-1">Run AI agents to start collecting metrics</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Target className="h-5 w-5 text-green-600" />
          How to Verify Effectiveness
        </h2>
        <div className="grid grid-cols-2 gap-6 text-sm text-gray-700">
          <div>
            <p className="font-medium text-gray-900 mb-2">What These Metrics Prove:</p>
            <ul className="space-y-1">
              <li>• <strong>Sync Accuracy</strong>: Products are being synced with CJ without errors</li>
              <li>• <strong>Average Margin</strong>: The pricing agent is maintaining healthy profit margins</li>
              <li>• <strong>Inventory Health</strong>: Product data quality is being monitored and improved</li>
              <li>• <strong>Stock Match Rate</strong>: Your inventory levels match the supplier's data</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-gray-900 mb-2">What to Look For:</p>
            <ul className="space-y-1">
              <li>• <strong>Green trends</strong> = AI is improving the metric over time</li>
              <li>• <strong>High success rate</strong> = Fewer errors, more reliable automation</li>
              <li>• <strong>Low sync latency</strong> = Fast and efficient synchronization</li>
              <li>• <strong>Growing history</strong> = System is actively working and recording data</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
