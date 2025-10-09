"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

type JobsResp = { ok: boolean; jobs?: JobRow[]; error?: string };

type ActionResp = { ok: boolean; error?: string };

export default function JobsPage() {
  const [rows, setRows] = useState<JobRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/admin/jobs?limit=100`, { cache: 'no-store' });
      const j: JobsResp = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setRows(j.jobs || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load jobs');
      setRows([]);
    } finally { setLoading(false); }
  }

  async function cancel(id: number) {
    setActing(id); setError(null);
    try {
      const r = await fetch(`/api/admin/jobs/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cancel' }) });
      const j: ActionResp = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Cancel failed');
    } finally { setActing(null); }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Jobs</h1>
        <Link href="/admin/console" className="text-sm text-blue-600 hover:underline">Back to Console</Link>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="rounded border bg-white overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Kind</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Created</th>
              <th className="p-2 text-left">Started</th>
              <th className="p-2 text-left">Finished</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map(j => (
              <tr key={j.id} className="border-t">
                <td className="p-2 font-mono text-xs">{j.id}</td>
                <td className="p-2">{j.kind}</td>
                <td className="p-2">{j.status}</td>
                <td className="p-2">{new Date(j.created_at).toLocaleString()}</td>
                <td className="p-2">{j.started_at ? new Date(j.started_at).toLocaleString() : '-'}</td>
                <td className="p-2">{j.finished_at ? new Date(j.finished_at).toLocaleString() : '-'}</td>
                <td className="p-2 text-right">
                  <div className="inline-flex gap-2">
                    <Link href={`/admin/jobs/${j.id}`} className="rounded bg-blue-600 px-2 py-1 text-white text-xs hover:bg-blue-700">Open</Link>
                    {j.status !== 'success' && j.status !== 'canceled' && (
                      <button onClick={() => cancel(j.id)} disabled={acting===j.id || loading} className="rounded bg-rose-600 px-2 py-1 text-white text-xs hover:bg-rose-700">Cancel</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {(!rows || rows.length===0) && !loading && (
              <tr><td colSpan={7} className="p-4 text-center text-sm text-muted-foreground">No jobs</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && <div className="text-sm text-gray-500">Loading…</div>}
    </div>
  );
}
