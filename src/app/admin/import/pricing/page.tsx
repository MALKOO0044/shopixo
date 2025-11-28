"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Calculator,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  DollarSign,
  Percent,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

type PricingRule = {
  id: number;
  category: string;
  margin_percent: number;
  min_profit_sar: number;
  vat_percent: number;
  payment_fee_percent: number;
  smart_rounding_enabled: boolean;
  rounding_targets: number[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

const defaultCategories = [
  "General",
  "Clothing",
  "Electronics",
  "Home & Garden",
  "Beauty",
  "Sports",
  "Accessories",
  "Jewelry",
  "Kids",
  "Shoes",
];

export default function PricingRulesPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<PricingRule>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const [testCost, setTestCost] = useState(10);
  const [testShipping, setTestShipping] = useState(5);
  const [testCategory, setTestCategory] = useState("General");
  const [testResult, setTestResult] = useState<{
    baseUsd: number;
    shippingUsd: number;
    baseSar: number;
    shippingSar: number;
    vat: number;
    paymentFee: number;
    margin: number;
    retailSar: number;
    profit: number;
  } | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pricing/rules");
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to fetch rules");
      }
      setRules(data.rules || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load pricing rules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const startEdit = (rule: PricingRule) => {
    setEditingId(rule.id);
    setEditData({ ...rule });
    setIsAddingNew(false);
  };

  const startNew = () => {
    setIsAddingNew(true);
    setEditingId(null);
    setEditData({
      category: "",
      margin_percent: 40,
      min_profit_sar: 35,
      vat_percent: 15,
      payment_fee_percent: 2.9,
      smart_rounding_enabled: true,
      rounding_targets: [49, 79, 99, 149, 199, 249, 299],
      is_default: false,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAddingNew(false);
    setEditData({});
  };

  const saveRule = async () => {
    if (!editData.category?.trim()) {
      setError("Category name is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const method = isAddingNew ? "POST" : "PUT";
      const body = isAddingNew ? editData : { id: editingId, ...editData };

      const res = await fetch("/api/admin/pricing/rules", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to save rule");
      }

      setSuccess(isAddingNew ? "Rule created successfully" : "Rule updated successfully");
      cancelEdit();
      fetchRules();

      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.message || "Failed to save rule");
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (id: number) => {
    if (!confirm("Are you sure you want to delete this pricing rule?")) return;

    try {
      const res = await fetch(`/api/admin/pricing/rules?id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to delete rule");
      }

      setSuccess("Rule deleted successfully");
      fetchRules();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.message || "Failed to delete rule");
    }
  };

  const calculateTest = () => {
    const rule = rules.find(r => r.category === testCategory) || rules.find(r => r.is_default);
    if (!rule) {
      setTestResult(null);
      return;
    }

    const usdToSar = 3.75;
    const baseSar = testCost * usdToSar;
    const shippingSar = testShipping * usdToSar;
    const subtotal = baseSar + shippingSar;
    const vat = subtotal * (rule.vat_percent / 100);
    const afterVat = subtotal + vat;
    const paymentFee = afterVat * (rule.payment_fee_percent / 100);
    const landed = afterVat + paymentFee;
    const margin = landed * (rule.margin_percent / 100);
    let retailSar = landed + margin;

    if (rule.smart_rounding_enabled && rule.rounding_targets?.length > 0) {
      const targets = rule.rounding_targets.sort((a, b) => a - b);
      const closest = targets.find(t => t >= retailSar) || targets[targets.length - 1];
      retailSar = closest;
    } else {
      retailSar = Math.ceil(retailSar);
    }

    const profit = retailSar - landed;

    setTestResult({
      baseUsd: testCost,
      shippingUsd: testShipping,
      baseSar,
      shippingSar,
      vat,
      paymentFee,
      margin,
      retailSar,
      profit: Math.max(profit, rule.min_profit_sar),
    });
  };

  useEffect(() => {
    if (rules.length > 0) {
      calculateTest();
    }
  }, [testCost, testShipping, testCategory, rules]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing Rules</h1>
          <p className="text-sm text-gray-500 mt-1">قواعد التسعير - Configure margins, VAT, and rounding per category</p>
        </div>
        <button
          onClick={startNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Rule
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <span className="text-red-800 text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          <span className="text-green-800 text-sm">{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {isAddingNew && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <h3 className="font-medium text-gray-900 mb-4">New Pricing Rule</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                  <select
                    value={editData.category || ""}
                    onChange={(e) => setEditData(d => ({ ...d, category: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">Select category...</option>
                    {defaultCategories.map(cat => (
                      <option key={cat} value={cat} disabled={rules.some(r => r.category === cat)}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Margin %</label>
                  <input
                    type="number"
                    value={editData.margin_percent || 40}
                    onChange={(e) => setEditData(d => ({ ...d, margin_percent: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    min={0}
                    max={200}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Min Profit SAR</label>
                  <input
                    type="number"
                    value={editData.min_profit_sar || 35}
                    onChange={(e) => setEditData(d => ({ ...d, min_profit_sar: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">VAT %</label>
                  <input
                    type="number"
                    value={editData.vat_percent || 15}
                    onChange={(e) => setEditData(d => ({ ...d, vat_percent: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    min={0}
                    max={100}
                    step={0.1}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Payment Fee %</label>
                  <input
                    type="number"
                    value={editData.payment_fee_percent || 2.9}
                    onChange={(e) => setEditData(d => ({ ...d, payment_fee_percent: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    min={0}
                    max={100}
                    step={0.1}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="smart-rounding-new"
                    checked={editData.smart_rounding_enabled || false}
                    onChange={(e) => setEditData(d => ({ ...d, smart_rounding_enabled: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="smart-rounding-new" className="text-sm text-gray-700">Smart Rounding</label>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={saveRule}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Create Rule
                </button>
                <button onClick={cancelEdit} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
              Loading pricing rules...
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white rounded-xl border">
              <Calculator className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No pricing rules configured</p>
              <button onClick={startNew} className="text-blue-600 hover:underline text-sm mt-2">
                Create your first rule
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Margin</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Profit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">VAT</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rounding</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rules.map((rule) => (
                    editingId === rule.id ? (
                      <tr key={rule.id} className="bg-blue-50">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="grid grid-cols-5 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Category</label>
                              <input
                                type="text"
                                value={editData.category || ""}
                                onChange={(e) => setEditData(d => ({ ...d, category: e.target.value }))}
                                className="w-full px-2 py-1.5 border rounded text-sm"
                                disabled={rule.is_default}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Margin %</label>
                              <input
                                type="number"
                                value={editData.margin_percent || 0}
                                onChange={(e) => setEditData(d => ({ ...d, margin_percent: Number(e.target.value) }))}
                                className="w-full px-2 py-1.5 border rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Min Profit</label>
                              <input
                                type="number"
                                value={editData.min_profit_sar || 0}
                                onChange={(e) => setEditData(d => ({ ...d, min_profit_sar: Number(e.target.value) }))}
                                className="w-full px-2 py-1.5 border rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">VAT %</label>
                              <input
                                type="number"
                                value={editData.vat_percent || 0}
                                onChange={(e) => setEditData(d => ({ ...d, vat_percent: Number(e.target.value) }))}
                                className="w-full px-2 py-1.5 border rounded text-sm"
                              />
                            </div>
                            <div className="flex items-end gap-2">
                              <button
                                onClick={saveRule}
                                disabled={saving}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
                              >
                                {saving ? "..." : "Save"}
                              </button>
                              <button onClick={cancelEdit} className="px-3 py-1.5 border rounded text-sm">
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={rule.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{rule.category}</span>
                            {rule.is_default && (
                              <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-500">Default</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-blue-600 font-medium">{rule.margin_percent}%</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-green-600">SAR {rule.min_profit_sar}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-600">{rule.vat_percent}%</span>
                        </td>
                        <td className="px-4 py-3">
                          {rule.smart_rounding_enabled ? (
                            <span className="text-emerald-600">Enabled</span>
                          ) : (
                            <span className="text-gray-400">Disabled</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEdit(rule)}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {!rule.is_default && (
                              <button
                                onClick={() => deleteRule(rule.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              Price Calculator
            </h3>
            <p className="text-sm text-gray-500 mb-4">حاسبة الأسعار - Test your pricing formula</p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                <select
                  value={testCategory}
                  onChange={(e) => setTestCategory(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  {rules.map(r => (
                    <option key={r.category} value={r.category}>{r.category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Product Cost (USD)</label>
                <input
                  type="number"
                  value={testCost}
                  onChange={(e) => setTestCost(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  min={0}
                  step={0.01}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Shipping Cost (USD)</label>
                <input
                  type="number"
                  value={testShipping}
                  onChange={(e) => setTestShipping(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  min={0}
                  step={0.01}
                />
              </div>
            </div>

            {testResult && (
              <div className="mt-6 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Base Cost</span>
                  <span>SAR {testResult.baseSar.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shipping</span>
                  <span>SAR {testResult.shippingSar.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">VAT (15%)</span>
                  <span>SAR {testResult.vat.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Payment Fee</span>
                  <span>SAR {testResult.paymentFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Margin</span>
                  <span>SAR {testResult.margin.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span className="text-gray-900">Retail Price</span>
                  <span className="text-green-600">SAR {testResult.retailSar.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Profit</span>
                  <span>SAR {testResult.profit.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <h4 className="font-medium text-amber-800 mb-2">Pricing Formula</h4>
            <div className="text-xs text-amber-700 space-y-1 font-mono">
              <p>Base Cost (SAR) = CJ Price × 3.75</p>
              <p>+ DDP Shipping (SAR)</p>
              <p>+ VAT (15%)</p>
              <p>+ Payment Fee (2.9%)</p>
              <p>+ Margin (%)</p>
              <p className="pt-1 border-t border-amber-200">= Final Price → Smart Rounded</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
