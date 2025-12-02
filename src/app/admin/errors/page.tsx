"use client";

import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Settings } from "lucide-react";

type ErrorLog = {
  id: number;
  error_type: string;
  error_code?: string;
  message: string;
  details?: any;
  page?: string;
  user_email?: string;
  created_at: string;
};

type ServiceHealth = {
  service: string;
  status: 'ok' | 'error' | 'unknown';
  message: string;
  latencyMs?: number;
};

export default function ErrorDashboardPage() {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationMode, setNotificationMode] = useState<'visible' | 'silent'>('visible');
  const [savingMode, setSavingMode] = useState(false);
  const [health, setHealth] = useState<{ status: string; services: ServiceHealth[] } | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const fetchErrors = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/errors?limit=100');
      const data = await res.json();
      if (data.ok) {
        setErrors(data.errors || []);
        setNotificationMode(data.notificationMode || 'visible');
      }
    } catch (e) {
      console.error('Failed to fetch errors:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/admin/health');
      const data = await res.json();
      if (data.ok) {
        setHealth({
          status: data.status,
          services: data.services || [],
        });
      }
    } catch (e) {
      console.error('Failed to fetch health:', e);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors();
    fetchHealth();
  }, []);

  const toggleMode = async () => {
    const newMode = notificationMode === 'visible' ? 'silent' : 'visible';
    setSavingMode(true);
    try {
      const res = await fetch('/api/admin/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationMode: newMode }),
      });
      const data = await res.json();
      if (data.ok) {
        setNotificationMode(newMode);
      }
    } catch (e) {
      console.error('Failed to update mode:', e);
    } finally {
      setSavingMode(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'cj_api': return 'bg-purple-100 text-purple-800';
      case 'search': return 'bg-blue-100 text-blue-800';
      case 'shipping': return 'bg-cyan-100 text-cyan-800';
      case 'pricing': return 'bg-amber-100 text-amber-800';
      case 'database': return 'bg-red-100 text-red-800';
      case 'auth': return 'bg-orange-100 text-orange-800';
      case 'payment': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Error Dashboard</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchErrors}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Health Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">System Health</h2>
            <button
              onClick={fetchHealth}
              disabled={healthLoading}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Check Now
            </button>
          </div>
          
          {healthLoading ? (
            <div className="text-gray-500">Checking services...</div>
          ) : health ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {health.services.map((service, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-lg border ${
                    service.status === 'ok' ? 'border-green-200 bg-green-50' :
                    service.status === 'error' ? 'border-red-200 bg-red-50' :
                    'border-yellow-200 bg-yellow-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(service.status)}
                    <span className="font-medium">{service.service}</span>
                  </div>
                  <div className="text-sm text-gray-600">{service.message}</div>
                  {service.latencyMs !== undefined && (
                    <div className="text-xs text-gray-400 mt-1">{service.latencyMs}ms</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-red-500">Failed to check health</div>
          )}
        </div>

        {/* Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Notification Settings
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {notificationMode === 'visible' 
                  ? 'Errors are shown immediately on screen (recommended)'
                  : 'Errors are logged silently without notifications'}
              </p>
            </div>
            <button
              onClick={toggleMode}
              disabled={savingMode}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                notificationMode === 'visible'
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              {savingMode ? 'Saving...' : notificationMode === 'visible' ? 'Visible Mode' : 'Silent Mode'}
            </button>
          </div>
        </div>

        {/* Error Logs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Errors</h2>
            <p className="text-sm text-gray-600">Last 100 errors logged in the system</p>
          </div>
          
          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading errors...</div>
          ) : errors.length === 0 ? (
            <div className="p-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <div className="text-gray-600">No errors logged yet</div>
              <div className="text-sm text-gray-400">Everything is running smoothly</div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {errors.map((error) => (
                <div key={error.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(error.error_type)}`}>
                          {error.error_type}
                        </span>
                        {error.error_code && (
                          <span className="text-xs text-gray-500">#{error.error_code}</span>
                        )}
                        <span className="text-xs text-gray-400">{formatDate(error.created_at)}</span>
                      </div>
                      <div className="text-sm text-gray-900">{error.message}</div>
                      {error.page && (
                        <div className="text-xs text-gray-500 mt-1">Page: {error.page}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
