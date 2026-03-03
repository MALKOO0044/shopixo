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
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-5 w-5 text-blue-600" />
            <h3 className="text-base font-semibold text-gray-900">Sync Accuracy</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-gray-900">{data.kpis.syncAccuracy.current.toFixed(1)}%</span>
            <TrendIndicator value={data.kpis.syncAccuracy.trend} />
          </div>
          <div className="mt-3">
            <MiniChart data={data.kpis.syncAccuracy.history} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <h3 className="text-base font-semibold text-gray-900">Average Margin</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-gray-900">{data.kpis.averageMargin.current.toFixed(1)}%</span>
            <TrendIndicator value={data.kpis.averageMargin.trend} />
          </div>
          <div className="mt-3">
            <MiniChart data={data.kpis.averageMargin.history} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="h-5 w-5 text-amber-600" />
            <h3 className="text-base font-semibold text-gray-900">Inventory Health</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-gray-900">{data.kpis.inventoryHealth.current.toFixed(1)}%</span>
            <TrendIndicator value={data.kpis.inventoryHealth.trend} />
          </div>
          <div className="mt-3">
            <MiniChart data={data.kpis.inventoryHealth.history} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-purple-600" />
            <h3 className="text-base font-semibold text-gray-900">Sync Latency</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-gray-900">{data.kpis.syncLatency.current.toFixed(1)} min</span>
            <TrendIndicator value={data.kpis.syncLatency.trend} inverse />
          </div>
          <div className="mt-3">
            <MiniChart data={data.kpis.syncLatency.history} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-2">
            <LineChart className="h-5 w-5 text-teal-600" />
            <h3 className="text-base font-semibold text-gray-900">Stock Match Rate</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-gray-900">{data.kpis.stockMatchRate.current.toFixed(1)}%</span>
            <TrendIndicator value={data.kpis.stockMatchRate.trend} />
          </div>
          <div className="mt-3">
            <MiniChart data={data.kpis.stockMatchRate.history} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-5 w-5 text-rose-600" />
            <h3 className="text-base font-semibold text-gray-900">Out of Stock Rate</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-gray-900">{data.kpis.outOfStockRate.current.toFixed(1)}%</span>
            <TrendIndicator value={data.kpis.outOfStockRate.trend} inverse />
          </div>
          <div className="mt-3">
            <MiniChart data={data.kpis.outOfStockRate.history} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Recent Metrics Activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-3 pr-4">Metric</th>
                <th className="pb-3 pr-4">Value</th>
                <th className="pb-3 pr-4">Trend</th>
                <th className="pb-3">Recorded At</th>
              </tr>
            </thead>
            <tbody>
              {data.recentMetrics.map((m: any, idx: number) => (
                <tr key={idx} className="border-b last:border-b-0">
                  <td className="py-3 pr-4 text-gray-900">
                    <div className="font-medium">{m.metric_type.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-gray-500">{m.agent_name}</div>
                  </td>
                  <td className="py-3 pr-4 text-gray-900 font-medium">
                    {Number(m.value).toFixed(2)} {m.unit}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                      (m.delta || 0) > 0 ? 'bg-green-100 text-green-700' : 
                      (m.delta || 0) < 0 ? 'bg-red-100 text-red-700' : 
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {(m.delta || 0) > 0 ? <TrendingUp className="h-3 w-3" /> : 
                       (m.delta || 0) < 0 ? <TrendingDown className="h-3 w-3" /> : 
                       <Minus className="h-3 w-3" />}
                      {(m.delta || 0) > 0 ? '+' : ''}{Number(m.delta || 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 text-gray-700">
                    {new Date(m.recorded_at).toLocaleString()}
                  </td>
                </tr>
              ))}
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
              <li>• <strong>Stock Match Rate</strong>: Your inventory levels match the supplier&#39;s data</li>
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