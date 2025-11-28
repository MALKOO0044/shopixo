import Link from "next/link";
import type { Route } from "next";
import { createClient } from "@supabase/supabase-js";
import {
  Download,
  ListChecks,
  Calculator,
  RefreshCw,
  Package,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function getStats() {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  try {
    const { data: queueData } = await admin.from("product_queue").select("status");
    const { data: syncData } = await admin.from("daily_sync_changes").select("status");
    const { data: batchData } = await admin.from("import_batches").select("id").limit(1);

    const queueStats = { pending: 0, approved: 0, imported: 0, rejected: 0 };
    (queueData || []).forEach((p: any) => {
      queueStats[p.status as keyof typeof queueStats] = (queueStats[p.status as keyof typeof queueStats] || 0) + 1;
    });

    const syncStats = { pending: 0 };
    (syncData || []).forEach((c: any) => {
      if (c.status === "pending") syncStats.pending++;
    });

    return {
      queue: queueStats,
      sync: syncStats,
      hasBatches: (batchData || []).length > 0,
    };
  } catch {
    return null;
  }
}

export default async function ImportDashboardPage() {
  const stats = await getStats();

  const quickActions = [
    {
      href: "/admin/import/discover" as Route,
      icon: Download,
      title: "Discover Products",
      titleAr: "اكتشاف المنتجات",
      description: "Search CJ catalog and add products to queue",
      color: "blue",
    },
    {
      href: "/admin/import/queue" as Route,
      icon: ListChecks,
      title: "Import Queue",
      titleAr: "قائمة الانتظار",
      description: "Review and approve products for import",
      color: "green",
      badge: stats?.queue?.pending || 0,
    },
    {
      href: "/admin/import/pricing" as Route,
      icon: Calculator,
      title: "Pricing Rules",
      titleAr: "قواعد التسعير",
      description: "Configure margins, VAT, and smart rounding",
      color: "purple",
    },
    {
      href: "/admin/sync" as Route,
      icon: RefreshCw,
      title: "Daily Sync",
      titleAr: "المزامنة اليومية",
      description: "Monitor price and stock changes",
      color: "amber",
      badge: stats?.sync?.pending || 0,
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200" },
    green: { bg: "bg-green-100", text: "text-green-600", border: "border-green-200" },
    purple: { bg: "bg-purple-100", text: "text-purple-600", border: "border-purple-200" },
    amber: { bg: "bg-amber-100", text: "text-amber-600", border: "border-amber-200" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Product Import System</h1>
        <p className="text-sm text-gray-500 mt-1">نظام استيراد المنتجات - Discover, review, and import products from CJ Dropshipping</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats?.queue?.pending || 0}</span>
          </div>
          <p className="mt-2 text-sm text-gray-600">Pending Review</p>
        </div>
        
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats?.queue?.approved || 0}</span>
          </div>
          <p className="mt-2 text-sm text-gray-600">Approved</p>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats?.queue?.imported || 0}</span>
          </div>
          <p className="mt-2 text-sm text-gray-600">Imported</p>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats?.sync?.pending || 0}</span>
          </div>
          <p className="mt-2 text-sm text-gray-600">Sync Changes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          const colors = colorClasses[action.color];
          
          return (
            <Link
              key={action.href}
              href={action.href}
              className={`bg-white rounded-xl border-2 ${colors.border} p-6 hover:shadow-md transition-all group`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center`}>
                  <Icon className={`h-6 w-6 ${colors.text}`} />
                </div>
                {action.badge !== undefined && action.badge > 0 && (
                  <span className={`px-2 py-1 ${colors.bg} ${colors.text} rounded-full text-sm font-medium`}>
                    {action.badge}
                  </span>
                )}
              </div>
              
              <div className="mt-4">
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                  {action.title}
                  <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">{action.titleAr}</p>
                <p className="text-sm text-gray-600 mt-2">{action.description}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">How Product Import Works</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto font-bold">1</div>
            <p className="text-sm font-medium text-gray-900 mt-2">Discover</p>
            <p className="text-xs text-gray-500">Search CJ catalog</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto font-bold">2</div>
            <p className="text-sm font-medium text-gray-900 mt-2">Review</p>
            <p className="text-xs text-gray-500">Check quality & pricing</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto font-bold">3</div>
            <p className="text-sm font-medium text-gray-900 mt-2">Approve</p>
            <p className="text-xs text-gray-500">Confirm for import</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto font-bold">4</div>
            <p className="text-sm font-medium text-gray-900 mt-2">Import</p>
            <p className="text-xs text-gray-500">Add to your store</p>
          </div>
        </div>
      </div>
    </div>
  );
}
