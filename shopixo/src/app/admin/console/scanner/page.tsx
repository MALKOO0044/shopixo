"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ScannerSettings = {
  enabled: boolean;
  daily_report_time?: string | null;
  low_stock_threshold?: number | null;
  price_change_threshold?: number | null;
};

type GetResp = { ok: boolean; settings?: ScannerSettings; error?: string };

type SaveResp = { ok: boolean; settings?: ScannerSettings; error?: string };

type WatchItem = {
  id: number;
  cj_product_id: string;
  cj_sku: string | null;
  threshold_low: number;
  watch_price: boolean;
  watch_stock: boolean;
  created_at: string;
};

type WatchListResp = { ok: boolean; watch?: WatchItem[]; error?: string };

type ActionResp = { ok: boolean; error?: string };

export default function ScannerSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<ScannerSettings>({ enabled: false, daily_report_time: "09:00", low_stock_threshold: 5, price_change_threshold: 5 });

  const [watch, setWatch] = useState<WatchItem[]>([]);
  const [wPid, setWPid] = useState("");
  const [wSku, setWSku] = useState("");
  const [wLow, setWLow] = useState(0);
  const [wPrice, setWPrice] = useState(true);
  const [wStock, setWStock] = useState(true);

  async function loadAll() {
    setLoading(true); setError(null);
    try {
      const [a, b] = await Promise.all([
        fetch('/api/admin/scanner/settings', { cache: 'no-store' }),
        fetch('/api/admin/scanner/watch', { cache: 'no-store' }),
      ]);
      const j1: GetResp = await a.json();
      const j2: WatchListResp = await b.json();
      if (!a.ok || !j1.ok) throw new Error(j1.error || `HTTP ${a.status}`);
      if (!b.ok || !j2.ok) throw new Error(j2.error || `HTTP ${b.status}`);
      setSettings(j1.settings!);
      setWatch(j2.watch || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load scanner');
      setWatch([]);
    } finally { setLoading(false); }
  }

  async function save() {
    setSaving(true); setError(null);
    try {
      const r = await fetch('/api/admin/scanner/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
      const j: SaveResp = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
    } catch (e: any) {
      setError(e?.message || 'Save failed');
    } finally { setSaving(false); }
  }

  async function addWatch() {
    setSaving(true); setError(null);
    try {
      const r = await fetch('/api/admin/scanner/watch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cj_product_id: wPid, cj_sku: wSku || null, threshold_low: wLow, watch_price: wPrice, watch_stock: wStock }) });
      const j: ActionResp = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setWPid(""); setWSku(""); setWLow(0); setWPrice(true); setWStock(true);
      await loadAll();
    } catch (e: any) {
      setError(e?.message || 'Add failed');
    } finally { setSaving(false); }
  }

  async function removeWatch(pid: string, sku?: string | null) {
    setSaving(true); setError(null);
    try {
      const u = new URL('/api/admin/scanner/watch', window.location.origin);
      u.searchParams.set('cj_product_id', pid);
      if (sku) u.searchParams.set('cj_sku', sku);
      const r = await fetch(u.toString(), { method: 'DELETE' });
      const j: ActionResp = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      await loadAll();
    } catch (e: any) {
      setError(e?.message || 'Delete failed');
    } finally { setSaving(false); }
  }

  useEffect(() => { loadAll(); }, []);

  return (
    <div className="space-y-8">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Scanner Settings</h1>
        <Link href="/admin/console" className="text-sm text-blue-600 hover:underline">Back to Console</Link>
      </header>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <section className="rounded border bg-white p-4 space-y-4">
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={!!settings.enabled} onChange={e => setSettings(s => ({ ...s, enabled: e.target.checked }))} />
            <span>Enable 24/7 Scanner</span>
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Daily report time (HH:MM)</div>
            <input className="w-full rounded border px-2 py-1" value={settings.daily_report_time || ''} onChange={e => setSettings(s => ({ ...s, daily_report_time: e.target.value }))} placeholder="09:00" />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Low stock threshold</div>
            <input type="number" className="w-full rounded border px-2 py-1" value={settings.low_stock_threshold ?? 0} onChange={e => setSettings(s => ({ ...s, low_stock_threshold: Math.max(0, Number(e.target.value||0)) }))} />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Price change threshold (%)</div>
            <input type="number" className="w-full rounded border px-2 py-1" value={settings.price_change_threshold ?? 0} onChange={e => setSettings(s => ({ ...s, price_change_threshold: Math.max(0, Number(e.target.value||0)) }))} />
          </label>
        </div>
        <div>
          <button onClick={save} disabled={saving} className="rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700">Save</button>
        </div>
      </section>

      <section className="rounded border bg-white p-4 space-y-3">
        <h2 className="text-lg font-medium">Watch List</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input className="rounded border px-2 py-1" placeholder="CJ Product ID" value={wPid} onChange={e => setWPid(e.target.value)} />
          <input className="rounded border px-2 py-1" placeholder="CJ SKU (optional)" value={wSku} onChange={e => setWSku(e.target.value)} />
          <input type="number" className="rounded border px-2 py-1" placeholder="Low stock" value={wLow} onChange={e => setWLow(Math.max(0, Number(e.target.value||0)))} />
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={wPrice} onChange={e => setWPrice(e.target.checked)} /> Watch Price</label>
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={wStock} onChange={e => setWStock(e.target.checked)} /> Watch Stock</label>
        </div>
        <div>
          <button onClick={addWatch} disabled={saving || !wPid} className="rounded bg-green-600 px-3 py-1.5 text-white hover:bg-green-700">Add/Update</button>
        </div>

        <div className="rounded border bg-muted/20 overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="p-2 text-left">CJ Product</th>
                <th className="p-2 text-left">CJ SKU</th>
                <th className="p-2 text-left">Low</th>
                <th className="p-2 text-left">Price</th>
                <th className="p-2 text-left">Stock</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(watch || []).map(w => (
                <tr key={w.id} className="border-t">
                  <td className="p-2 font-mono text-xs">{w.cj_product_id}</td>
                  <td className="p-2 font-mono text-xs">{w.cj_sku || '-'}</td>
                  <td className="p-2">{w.threshold_low}</td>
                  <td className="p-2">{w.watch_price ? 'Yes' : 'No'}</td>
                  <td className="p-2">{w.watch_stock ? 'Yes' : 'No'}</td>
                  <td className="p-2 text-right">
                    <button onClick={() => removeWatch(w.cj_product_id, w.cj_sku || undefined)} className="rounded bg-rose-600 px-2 py-1 text-white text-xs hover:bg-rose-700">Remove</button>
                  </td>
                </tr>
              ))}
              {(!watch || watch.length===0) && !loading && (
                <tr><td colSpan={6} className="p-4 text-center text-sm text-muted-foreground">Empty</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {loading && <div className="text-sm text-gray-500">Loading…</div>}
    </div>
  );
}
