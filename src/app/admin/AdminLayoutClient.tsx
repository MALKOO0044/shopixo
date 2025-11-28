"use client";

import Link from "next/link";
import type { Route } from "next";
import { ReactNode } from "react";
import {
  Languages,
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
  Wifi,
  LucideIcon
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

type NavItem = {
  href: string;
  labelEn: string;
  labelAr: string;
  icon: LucideIcon;
};

type NavSection = {
  titleEn: string;
  titleAr: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    titleEn: "Overview",
    titleAr: "نظرة عامة",
    items: [
      { href: "/admin", labelEn: "Dashboard", labelAr: "لوحة التحكم", icon: LayoutDashboard },
      { href: "/admin/orders", labelEn: "Orders", labelAr: "الطلبات", icon: ShoppingCart },
    ]
  },
  {
    titleEn: "Products",
    titleAr: "المنتجات",
    items: [
      { href: "/admin/products", labelEn: "All Products", labelAr: "جميع المنتجات", icon: Package },
      { href: "/admin/inventory", labelEn: "Inventory", labelAr: "المخزون", icon: Boxes },
    ]
  },
  {
    titleEn: "Product Import",
    titleAr: "استيراد المنتجات",
    items: [
      { href: "/admin/import/discover", labelEn: "Discover Products", labelAr: "اكتشاف المنتجات", icon: Download },
      { href: "/admin/import/queue", labelEn: "Import Queue", labelAr: "قائمة الاستيراد", icon: ListChecks },
      { href: "/admin/import/pricing", labelEn: "Pricing Rules", labelAr: "قواعد التسعير", icon: Calculator },
      { href: "/admin/cj/shipping", labelEn: "Shipping Calculator", labelAr: "حاسبة الشحن", icon: Calculator },
      { href: "/admin/cj/settings", labelEn: "CJ Settings", labelAr: "إعدادات CJ", icon: Wifi },
    ]
  },
  {
    titleEn: "Automation",
    titleAr: "الأتمتة",
    items: [
      { href: "/admin/sync", labelEn: "Daily Sync", labelAr: "المزامنة اليومية", icon: RefreshCw },
      { href: "/admin/jobs", labelEn: "Background Jobs", labelAr: "المهام الخلفية", icon: Clock },
    ]
  },
  {
    titleEn: "Content",
    titleAr: "المحتوى",
    items: [
      { href: "/admin/blog", labelEn: "Blog", labelAr: "المدونة", icon: FileText },
    ]
  },
  {
    titleEn: "Settings",
    titleAr: "الإعدادات",
    items: [
      { href: "/admin/settings", labelEn: "System Settings", labelAr: "إعدادات النظام", icon: Settings },
    ]
  }
];

interface AdminLayoutClientProps {
  children: ReactNode;
  email: string;
}

export function AdminLayoutClient({ children, email }: AdminLayoutClientProps) {
  const { lang, setLang, isRtl, dir, t } = useLanguage();

  const toggleLang = () => {
    setLang(lang === 'en' ? 'ar' : 'en');
  };

  return (
    <div className={`flex min-h-screen bg-gray-50 ${isRtl ? 'flex-row-reverse' : ''}`} dir={dir}>
      <aside className={`w-64 bg-gray-900 text-white flex flex-col ${isRtl ? 'order-last' : ''}`}>
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <Link href="/admin" className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-lg">{isRtl ? 'لوحة التحكم' : 'Shopixo Admin'}</span>
          </Link>
          <button
            onClick={toggleLang}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            title={lang === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
          >
            <Languages className="h-4 w-4" />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          {navSections.map((section) => (
            <div key={section.titleEn} className="mb-6">
              <p className={`px-5 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 ${isRtl ? 'text-right' : ''}`}>
                {isRtl ? section.titleAr : section.titleEn}
              </p>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href as Route}
                        className={`flex items-center gap-3 px-5 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors ${isRtl ? 'flex-row-reverse text-right' : ''}`}
                      >
                        <Icon className="h-4 w-4" />
                        {isRtl ? item.labelAr : item.labelEn}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-300">
                {email ? email[0].toUpperCase() : "?"}
              </span>
            </div>
            <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : ''}`}>
              <p className="text-sm font-medium text-gray-200 truncate">{email}</p>
              <p className="text-xs text-gray-500">{isRtl ? 'مدير' : 'Admin'}</p>
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
