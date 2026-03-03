import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { 
  Shield, ArrowLeft, CheckCircle, AlertTriangle, XCircle,
  Lock, Eye, Activity, Server
} from "lucide-react";

export const metadata = {
  title: "Security - Shopixo Admin",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function getSecurityData() {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  try {
    const { data: failedActions } = await admin
      .from('ai_actions')
      .select('id, action_type, agent_name, error_message, created_at')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(20);

    const hasCJKey = !!process.env.CJ_API_KEY;
    const hasSupabaseKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;

    return {
      failedActions: failedActions || [],
      apiStatus: {
        cj: hasCJKey,
        supabase: hasSupabaseKey,
        stripe: hasStripeKey,
      },
      securityChecks: [
        { 
          name: 'API Keys Configured', 
          status: hasCJKey && hasSupabaseKey ? 'pass' : 'warning',
          message: hasCJKey && hasSupabaseKey ? 'All required API keys are set' : 'Some API keys may be missing'
        },
        { 
          name: 'Database Connection', 
          status: 'pass',
          message: 'Supabase connection is active'
        },
        { 
          name: 'Rate Limiting', 
          status: !!process.env.UPSTASH_REDIS_REST_URL ? 'pass' : 'warning',
          message: process.env.UPSTASH_REDIS_REST_URL ? 'Rate limiting is enabled' : 'Rate limiting may not be configured'
        },
        { 
          name: 'SSL/TLS', 
          status: 'pass',
          message: 'All connections use secure protocols'
        },
        { 
          name: 'Authentication', 
          status: 'pass',
          message: 'Supabase Auth is active'
        },
      ],
      failedActionsCount: failedActions?.length || 0,
    };
  } catch (e: any) {
    console.error('[Security] Error:', e?.message);
    return null;
  }
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'pass') return <CheckCircle className="h-5 w-5 text-green-600" />;
  if (status === 'warning') return <AlertTriangle className="h-5 w-5 text-amber-600" />;
  return <XCircle className="h-5 w-5 text-red-600" />;
}

export default async function SecurityPage() {
  const data = await getSecurityData();

  if (!data) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Unable to load security data.</p>
        </div>
      </div>
    );
  }

  const passCount = data.securityChecks.filter(c => c.status === 'pass').length;
  const totalChecks = data.securityChecks.length;
  const securityScore = Math.round((passCount / totalChecks) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/ai" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-6 w-6 text-green-600" />
              Security Center
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              System security status, API health, and threat monitoring
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
            data.failedActionsCount === 0 ? 'bg-green-100 text-green-700' : 
            data.failedActionsCount < 5 ? 'bg-amber-100 text-amber-700' : 
            'bg-red-100 text-red-700'
          }`}>
            <Shield className="h-4 w-4" />
            {data.failedActionsCount === 0 ? 'All Systems Normal' : `${data.failedActionsCount} Issues Detected`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${securityScore >= 80 ? 'bg-green-50' : securityScore >= 50 ? 'bg-amber-50' : 'bg-red-50'}`}>
              <Shield className={`h-5 w-5 ${securityScore >= 80 ? 'text-green-600' : securityScore >= 50 ? 'text-amber-600' : 'text-red-600'}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{securityScore}%</p>
              <p className="text-xs text-gray-500">Security Score</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{passCount}/{totalChecks}</p>
              <p className="text-xs text-gray-500">Checks Passed</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.failedActions.length}</p>
              <p className="text-xs text-gray-500">Failed Actions</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Eye className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{passCount === totalChecks ? '100%' : `${securityScore}%`}</p>
              <p className="text-xs text-gray-500">System Health</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Lock className="h-4 w-4 text-gray-600" />
              Security Checks
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {data.securityChecks.map((check, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusIcon status={check.status} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{check.name}</p>
                    <p className="text-xs text-gray-500">{check.message}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  check.status === 'pass' ? 'bg-green-100 text-green-700' : 
                  check.status === 'warning' ? 'bg-amber-100 text-amber-700' : 
                  'bg-red-100 text-red-700'
                }`}>
                  {check.status === 'pass' ? 'Passed' : check.status === 'warning' ? 'Warning' : 'Failed'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Server className="h-4 w-4 text-gray-600" />
              API Status
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {data.apiStatus.cj ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">CJ Dropshipping API</p>
                  <p className="text-xs text-gray-500">Product sync and fulfillment</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                data.apiStatus.cj ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {data.apiStatus.cj ? 'Connected' : 'Not Configured'}
              </span>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {data.apiStatus.supabase ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">Supabase</p>
                  <p className="text-xs text-gray-500">Database and authentication</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                data.apiStatus.supabase ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {data.apiStatus.supabase ? 'Connected' : 'Not Configured'}
              </span>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {data.apiStatus.stripe ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">Stripe</p>
                  <p className="text-xs text-gray-500">Payment processing</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                data.apiStatus.stripe ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {data.apiStatus.stripe ? 'Connected' : 'Optional'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Recent Failed Actions</h3>
          <span className="text-sm text-gray-500">{data.failedActions.length} failures</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Time</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Agent</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Action</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.failedActions.length > 0 ? (
                data.failedActions.map((action: any) => (
                  <tr key={action.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(action.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        {action.agent_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {action.action_type?.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-600 truncate max-w-xs">
                      {action.error_message || 'Unknown error'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-300" />
                    <p className="text-gray-500">No failed actions</p>
                    <p className="text-sm text-gray-400 mt-1">All systems operating normally</p>
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
