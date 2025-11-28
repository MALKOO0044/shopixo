"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type GetResp = { ok: boolean; configured?: boolean; emailPreview?: string | null; base?: string | null; error?: string };
type SaveResp = { ok: boolean; error?: string };

export default function CjSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);
  const [email, setEmail] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [base, setBase] = useState("");

  async function load() {
    setLoading(true); setError(null);
    try {
      const r = await fetch('/api/admin/cj/settings', { cache: 'no-store' });
      const j: GetResp = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setConfigured(!!j.configured);
      if (typeof j.base === 'string') setBase(j.base);
    } catch (e: any) {
      setError(e?.message || 'Failed to load settings');
    } finally { setLoading(false); }
  }

  async function save() {
    setSaving(true); setError(null);
    try {
      const r = await fetch('/api/admin/cj/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, apiKey, base: base || null }) });
      const j: SaveResp = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setConfigured(true);
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    } finally { setSaving(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Supplier Settings</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/admin/console" className="text-blue-600 hover:underline">Admin Console</Link>
          <Link href="/api/admin/cj/diag?kw=dress" className="text-blue-600 hover:underline">Run Diagnostics</Link>
        </div>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <section className="rounded border bg-white p-4 space-y-4">
        <div className="text-sm text-muted-foreground">Provide supplier API credentials. These are stored in kv_settings (server-side).</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Supplier Account Email</div>
            <input value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded border px-2 py-1" placeholder="you@example.com" />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Supplier API Key</div>
            <input value={apiKey} onChange={e => setApiKey(e.target.value)} className="w-full rounded border px-2 py-1" placeholder="••••••" />
          </label>
        </div>
        <label className="text-sm block">
          <div className="text-gray-600 mb-1">Supplier API Base (optional)</div>
          <input value={base} onChange={e => setBase(e.target.value)} className="w-full rounded border px-2 py-1" placeholder="https://developers.cjdropshipping.com/api2.0/v1" />
        </label>
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving || !email || !apiKey} className="rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700">Save</button>
          {configured ? <span className="text-sm text-green-700">Configured</span> : <span className="text-sm text-amber-700">Not configured</span>}
        </div>
      </section>

      {loading && <div className="text-sm text-gray-500">Loading…</div>}

      <section className="rounded border bg-white p-4">
        <div className="font-medium mb-2">After saving</div>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          <li>Run <Link href="/api/admin/cj/diag?kw=dress" className="underline text-blue-600">Diagnostics</Link> to confirm token.</li>
          <li>Use <Link href="/admin/cj/finder" className="underline text-blue-600">Catalog Finder</Link> or <code className="bg-slate-100 px-1">auto-import</code> endpoints with your target categories.</li>
        </ul>
      </section>
    </div>
  );
}
