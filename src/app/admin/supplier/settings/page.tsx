"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, Wifi, WifiOff, RefreshCw, Save, ExternalLink } from "lucide-react";

type SettingsResp = {
  ok: boolean;
  configured?: boolean;
  emailPreview?: string | null;
  base?: string | null;
  error?: string;
};

export default function SupplierSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);
  const [email, setEmail] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/cj/settings", { cache: "no-store" });
      const j: SettingsResp = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setConfigured(!!j.configured);
      if (j.emailPreview) setEmail(j.emailPreview);
    } catch (e: any) {
      setError(e?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!email || !apiKey) {
      setError("Please fill in both email and API key");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const r = await fetch("/api/admin/cj/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, apiKey }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setConfigured(true);
      setSuccess("Settings saved successfully");
      setApiKey("");
    } catch (e: any) {
      setError(e?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await fetch("/api/admin/cj/v2/status", { cache: "no-store" });
      const j = await r.json();
      if (j.ok && j.connected) {
        setTestResult({ ok: true, message: `Connected (${j.latency}ms)` });
      } else {
        setTestResult({ ok: false, message: j.error || "Connection failed" });
      }
    } catch (e: any) {
      setTestResult({ ok: false, message: e?.message || "Test failed" });
    } finally {
      setTesting(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Supplier Settings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Configure your dropshipping supplier connection
            </p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border bg-white p-8 text-center text-gray-500">
          Loading settings...
        </div>
      )}

      {!loading && (
        <>
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="border-b px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {configured ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-gray-400" />
                )}
                <div>
                  <h2 className="font-semibold text-gray-900">Connection Status</h2>
                  <p className="text-sm text-gray-500">
                    {configured ? "Supplier API is configured" : "Not configured yet"}
                  </p>
                </div>
              </div>
              <button
                onClick={testConnection}
                disabled={testing || !configured}
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${testing ? "animate-spin" : ""}`} />
                Test Connection
              </button>
            </div>

            {testResult && (
              <div
                className={`mx-5 my-4 rounded-lg p-3 text-sm ${
                  testResult.ok
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {testResult.message}
              </div>
            )}

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="your-email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder={configured ? "••••••••••••••••" : "Enter your API key"}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {configured
                    ? "Leave blank to keep current key, or enter a new one to update"
                    : "Get your API key from your supplier dashboard"}
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                  {success}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={save}
                  disabled={saving || (!apiKey && configured)}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="border-b px-5 py-4">
              <h2 className="font-semibold text-gray-900">Getting Started</h2>
            </div>
            <div className="p-5">
              <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-600">
                <li>Enter your supplier account email and API key above</li>
                <li>Click "Test Connection" to verify the settings</li>
                <li>
                  Go to{" "}
                  <Link
                    href={"/admin/supplier/discover" as Route}
                    className="text-blue-600 underline"
                  >
                    Discover Products
                  </Link>{" "}
                  to search for products
                </li>
                <li>Add products to your import queue and review them</li>
                <li>Import approved products to your store</li>
              </ol>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
