"use client";

import Link from "next/link";
import type { Route } from "next";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Download,
  ListChecks,
  RefreshCw,
  Boxes,
  Clock,
  FileText,
  Settings,
  Smartphone,
  Headphones,
  LucideIcon,
  TrendingUp,
  Search,
  Bot,
  Activity,
  HeartPulse,
  Zap,
  Shield,
  Brain
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    title: "OVERVIEW",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
    ]
  },
  {
    title: "PRODUCTS",
    items: [
      { href: "/admin/products", label: "All Products", icon: Package },
      { href: "/admin/inventory", label: "Inventory", icon: Boxes },
    ]
  },
  {
    title: "CJ DROPSHIPPING",
    items: [
      { href: "/admin/import/discover", label: "Product Discovery", icon: Search },
      { href: "/admin/import/queue", label: "Review Queue", icon: ListChecks },
    ]
  },
  {
    title: "AUTOMATION",
    items: [
      { href: "/admin/sync", label: "Daily Sync", icon: RefreshCw },
      { href: "/admin/jobs", label: "Background Jobs", icon: Clock },
      { href: "/admin/import/pricing", label: "Pricing Rules", icon: FileText },
    ]
  },
  {
    title: "AI COMMAND CENTER",
    items: [
      { href: "/admin/ai", label: "Mission Control", icon: Brain },
      { href: "/admin/ai/activity", label: "Activity Log", icon: Activity },
      { href: "/admin/ai/inventory", label: "Inventory Health", icon: HeartPulse },
      { href: "/admin/ai/operations", label: "Operations", icon: Zap },
      { href: "/admin/ai/security", label: "Security", icon: Shield },
    ]
  }
];

interface AdminLayoutClientProps {
  children: ReactNode;
  email: string;
}

export function AdminLayoutClient({ children, email }: AdminLayoutClientProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>

      <aside className="w-60 bg-white border-l border-gray-200 flex flex-col shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <Link href="/admin" className="flex items-center gap-2 justify-end">
            <span className="font-bold text-gray-800">Shopixo Admin</span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
          </Link>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          {navSections.map((section) => (
            <div key={section.title} className="mb-4">
              <p className="px-4 mb-2 text-[10px] font-semibold tracking-wider text-gray-400 text-right">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || 
                    (item.href !== "/admin" && pathname?.startsWith(item.href));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href as Route}
                        className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors justify-end ${
                          isActive 
                            ? "text-amber-600 bg-amber-50 font-medium border-r-2 border-amber-500" 
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                      >
                        {item.label}
                        <Icon className="h-4 w-4" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-gray-100">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 justify-end"
          >
            View Store
            <TrendingUp className="h-4 w-4" />
          </Link>
        </div>

        <div className="p-3 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2 justify-end">
            <div className="text-right">
              <p className="text-xs font-medium text-gray-700 truncate max-w-[130px]">{email}</p>
              <p className="text-[10px] text-gray-400">Admin</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-amber-600">
                {email ? email[0].toUpperCase() : "?"}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
