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
import { LanguageProvider } from "@/lib/i18n";
import { AdminLayoutClient } from "./AdminLayoutClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const navSections = [
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
    <LanguageProvider>
      <AdminLayoutClient email={email} navSections={navSections}>
        {children}
      </AdminLayoutClient>
    </LanguageProvider>
  );
}
