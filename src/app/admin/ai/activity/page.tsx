import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { 
  Activity, CheckCircle, XCircle, Clock, RefreshCw,
  ArrowLeft, Filter, Download, RotateCcw
} from "lucide-react";

export const metadata = {
  title: "AI Activity Log - Shopixo Admin",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function getAIActions() {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  try {
    const { data, error } = await admin
      .from('ai_actions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[AI Activity] Error:', error.message);
      return [];
    }

    return data || [];
  } catch (e: any) {
    console.error('[AI Activity] Error:', e?.message);
    return [];
  }
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
    completed: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
    failed: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
    running: { bg: 'bg-blue-100', text: 'text-blue-700', icon: RefreshCw },
    rolled_back: { bg: 'bg-gray-100', text: 'text-gray-700', icon: RotateCcw },
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

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    info: 'bg-blue-100 text-blue-700',
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  };
  
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[severity] || styles.info}`}>
      {severity}
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
    marketing: 'bg-pink-100 text-pink-700',
    service: 'bg-cyan-100 text-cyan-700',
  };
  
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[agent] || 'bg-gray-100 text-gray-700'}`}>
      {agent}
    </span>
  );
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AIActivityPage() {
  const actions = await getAIActions();

  const stats = {
    total: actions.length,
    completed: actions.filter(a => a.status === 'completed').length,
    failed: actions.filter(a => a.status === 'failed').length,
    pending: actions.filter(a => a.status === 'pending' || a.status === 'running').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/ai" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="h-6 w-6 text-purple-600" />
              Activity Log
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Complete history of all AI actions and decisions
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-50 rounded-lg">
              <Activity className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Total Actions</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
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
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
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
              <p className="text-2xl font-bold text-gray-900">{stats.failed}</p>
              <p className="text-xs text-gray-500">Failed</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">All Actions</h3>
          <span className="text-sm text-gray-500">{actions.length} records</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Time</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Agent</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Action</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Entity</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Severity</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {actions.length > 0 ? (
                actions.map((action: any) => (
                  <tr key={action.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(action.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <AgentBadge agent={action.agent_name} />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {action.action_type?.replace(/_/g, ' ')}
                        </p>
                        {action.explanation && (
                          <p className="text-xs text-gray-500 truncate max-w-xs">{action.explanation}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {action.entity_type && action.entity_id ? (
                        <span>{action.entity_type} #{action.entity_id}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={action.status} />
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge severity={action.severity || 'info'} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {action.confidence_score ? (
                        <span className={`font-medium ${action.confidence_score >= 0.8 ? 'text-green-600' : action.confidence_score >= 0.5 ? 'text-amber-600' : 'text-red-600'}`}>
                          {Math.round(action.confidence_score * 100)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-500">No AI actions recorded yet</p>
                    <p className="text-sm text-gray-400 mt-1">Actions will appear here as the system runs</p>
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
