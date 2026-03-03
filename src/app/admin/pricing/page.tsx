"use client";

import React, { useState } from 'react';

export default function AdminPricingCalculatorPage() {
  const [supplierCostSar, setSupplierCostSar] = useState(10);
  const [actualKg, setActualKg] = useState(0.4);
  const [lengthCm, setLengthCm] = useState(25);
  const [widthCm, setWidthCm] = useState(20);
  const [heightCm, setHeightCm] = useState(3);
  const [margin, setMargin] = useState(0.35);
  const [handlingSar, setHandlingSar] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCalc(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/admin/pricing/calc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierCostSar, actualKg, lengthCm, widthCm, heightCm, margin, handlingSar }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || res.statusText);
      setResult(data);
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Pricing Calculator (KSA DDP)</h1>
      <form onSubmit={handleCalc} className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm">Supplier Cost (SAR)</span>
          <input type="number" step="0.01" className="mt-1 w-full border rounded p-2" value={supplierCostSar}
            onChange={(e) => setSupplierCostSar(parseFloat(e.target.value))} />
        </label>
        <label className="block">
          <span className="text-sm">Actual Weight (kg)</span>
          <input type="number" step="0.01" className="mt-1 w-full border rounded p-2" value={actualKg}
            onChange={(e) => setActualKg(parseFloat(e.target.value))} />
        </label>
        <label className="block">
          <span className="text-sm">Length (cm)</span>
          <input type="number" className="mt-1 w-full border rounded p-2" value={lengthCm}
            onChange={(e) => setLengthCm(parseFloat(e.target.value))} />
        </label>
        <label className="block">
          <span className="text-sm">Width (cm)</span>
          <input type="number" className="mt-1 w-full border rounded p-2" value={widthCm}
            onChange={(e) => setWidthCm(parseFloat(e.target.value))} />
        </label>
        <label className="block">
          <span className="text-sm">Height (cm)</span>
          <input type="number" className="mt-1 w-full border rounded p-2" value={heightCm}
            onChange={(e) => setHeightCm(parseFloat(e.target.value))} />
        </label>
        <label className="block">
          <span className="text-sm">Margin (0-1)</span>
          <input type="number" step="0.01" min={0} max={0.95} className="mt-1 w-full border rounded p-2" value={margin}
            onChange={(e) => setMargin(parseFloat(e.target.value))} />
        </label>
        <label className="block">
          <span className="text-sm">Handling (SAR)</span>
          <input type="number" step="0.01" className="mt-1 w-full border rounded p-2" value={handlingSar}
            onChange={(e) => setHandlingSar(parseFloat(e.target.value))} />
        </label>
        <div className="sm:col-span-2">
          <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50">
            {loading ? 'Calculating…' : 'Calculate'}
          </button>
        </div>
      </form>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {result && (
        <div className="rounded border p-4 space-y-2">
          <div className="font-medium">Result</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Billed Weight (kg)</div>
            <div className="text-right">{result.billedWeightKg}</div>
            <div>DDP Shipping (SAR)</div>
            <div className="text-right">{result.ddpShippingSar}</div>
            <div>Landed Cost (SAR)</div>
            <div className="text-right">{result.landedCostSar}</div>
            <div>Retail (SAR)</div>
            <div className="text-right font-semibold">{result.retailSar}</div>
            <div>Packaging</div>
            <div className="text-right">{result.packaging?.option?.code} → billed {result.packaging?.billedWeightKg}kg</div>
          </div>
          <pre className="bg-black text-green-300 text-xs p-3 rounded overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
