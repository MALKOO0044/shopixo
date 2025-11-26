import Link from "next/link";
import type { Route } from "next";
import { ReactNode } from "react";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Settings,
  Download,
  Calculator,
  RefreshCw,
  Boxes,
  ListChecks,
  Clock,
  Wifi
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const navSections = [
  {
    title: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
    ]
  },
  {
    title: "Products",
    items: [
      { href: "/admin/products", label: "All Products", icon: Package },
      { href: "/admin/inventory", label: "Inventory", icon: Boxes },
    ]
  },
  {
    title: "CJ Dropshipping",
    items: [
      { href: "/admin/cj/import", label: "Product Discovery", icon: Download },
      { href: "/admin/cj/queue", label: "Review Queue", icon: ListChecks },
      { href: "/admin/cj/settings", label: "CJ Settings", icon: Wifi },
    ]
  },
  {
    title: "Automation",
    items: [
      { href: "/admin/sync", label: "Daily Sync", icon: RefreshCw },
      { href: "/admin/jobs", label: "Background Jobs", icon: Clock },
      { href: "/admin/pricing", label: "Pricing Rules", icon: Calculator },
    ]
  },
  {
    title: "Content",
    items: [
      { href: "/admin/blog", label: "Blog", icon: FileText },
    ]
  },
  {
    title: "Settings",
    items: [
      { href: "/admin/console/settings", label: "System Settings", icon: Settings },
    ]
  }
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const adminDomains = (process.env.ADMIN_EMAIL_DOMAINS || "")
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
  const email = (user.email || "").toLowerCase();

  if (adminEmails.length > 0 || adminDomains.length > 0) {
    const matchesEmail = email && adminEmails.includes(email);
    const matchesDomain = email.includes("@") && adminDomains.includes(email.split("@")[1]);
    if (!(matchesEmail || matchesDomain)) redirect("/");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-5 border-b border-gray-800">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-lg">Shopixo Admin</span>
          </Link>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          {navSections.map((section) => (
            <div key={section.title} className="mb-6">
              <p className="px-5 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                {section.title}
              </p>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href as Route}
                        className="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-300">
                {email ? email[0].toUpperCase() : "?"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{email}</p>
              <p className="text-xs text-gray-500">Admin</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
