"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, RefreshCw, Clock, CheckCircle, XCircle, Pause, Play } from "lucide-react";

type JobRow = {
  id: number;
  created_at: string;
  kind: string;
  status: string;
  started_at?: string | null;
  finished_at?: string | null;
  totals?: any;
  error_text?: string | null;
};

type JobsResp = { ok: boolean; jobs?: JobRow[]; error?: string; tablesMissing?: boolean };

export default function JobsPage() {
  const [rows, setRows] = useState<JobRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tablesMissing, setTablesMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    setTablesMissing(false);
    try {
      const r = await fetch(`/api/admin/jobs?limit=100`, { cache: "no-store" });
      const j: JobsResp = await r.json();
      if (j.tablesMissing) {
        setTablesMissing(true);
        setError(j.error || 'Database tables missing');
        setRows([]);
        return;
      }
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setRows(j.jobs || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load jobs");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function cancel(id: number) {
    setActing(id);
    setError(null);
    try {
      const r = await fetch(`/api/admin/jobs/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      await load();
    } catch (e: any) {
      setError(e?.message || "Cancel failed");
    } finally {
      setActing(null);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  if (tablesMissing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Background Jobs</h1>
        </div>
        <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-6">
          <h2 className="text-lg font-semibold text-amber-800 mb-3">Database Setup Required</h2>
          <p className="text-amber-700 mb-4">
            The required database tables <code className="bg-amber-100 px-1 rounded">admin_jobs</code> and <code className="bg-amber-100 px-1 rounded">admin_job_items</code> do not exist.
          </p>
          <div className="bg-white rounded border p-4 text-sm">
            <p className="font-medium mb-2">To fix this, run the following SQL in your Supabase SQL Editor:</p>
            <pre className="bg-slate-100 p-3 rounded text-xs overflow-auto whitespace-pre-wrap">
{`CREATE TABLE IF NOT EXISTS public.admin_jobs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  kind TEXT NOT NULL CHECK (kind IN ('finder','import','sync','scanner')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','success','error','canceled')),
  params JSONB,
  totals JSONB,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error_text TEXT
);

CREATE TABLE IF NOT EXISTS public.admin_job_items (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT NOT NULL REFERENCES public.admin_jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','success','error','skipped','canceled')),
  step TEXT,
  cj_product_id TEXT,
  cj_sku TEXT,
  result JSONB,
  error_text TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_jobs_status_created ON public.admin_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_job_items_job ON public.admin_job_items(job_id);`}
            </pre>
          </div>
          <button onClick={load} className="mt-4 rounded bg-amber-600 px-4 py-2 text-white hover:bg-amber-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-700";
      case "running":
        return "bg-blue-100 text-blue-700";
      case "pending":
        return "bg-amber-100 text-amber-700";
      case "failed":
      case "error":
        return "bg-red-100 text-red-700";
      case "canceled":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4" />;
      case "running":
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "failed":
      case "error":
        return <XCircle className="h-4 w-4" />;
      case "canceled":
        return <Pause className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDuration = (start?: string | null, end?: string | null) => {
    if (!start) return "-";
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    if (duration < 60) return `${duration}s`;
    return `${Math.floor(duration / 60)}m ${duration % 60}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Background Jobs</h1>
            <p className="text-sm text-gray-500 mt-1">
              Monitor and manage automated tasks
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        {loading && rows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Loading jobs...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Clock className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="font-medium">No jobs yet</p>
            <p className="text-sm mt-1">
              Background jobs will appear here when tasks are running
            </p>
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left font-medium text-gray-600">ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Duration</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Created</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((j) => (
                <tr key={j.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{j.id}</td>
                  <td className="px-4 py-3">{j.kind}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(
                        j.status
                      )}`}
                    >
                      {getStatusIcon(j.status)}
                      {j.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDuration(j.started_at, j.finished_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(j.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <Link
                        href={`/admin/jobs/${j.id}` as Route}
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                      >
                        Details
                      </Link>
                      {j.status !== "success" && j.status !== "canceled" && j.status !== "failed" && (
                        <button
                          onClick={() => cancel(j.id)}
                          disabled={acting === j.id}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
