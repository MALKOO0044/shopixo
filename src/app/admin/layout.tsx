import Link from "next/link";
import type { Route } from "next";
import { ReactNode } from "react";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  // For now, we'll just protect the route. Role-based access will be next.
  if (!user) {
    redirect("/login?next=/admin");
  }

  // Enforce role-based access via ADMIN_EMAILS (comma-separated)
  // In production: if ADMIN_EMAILS is unset -> deny by default
  // In development: allow when unset for DX
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const email = (user.email || "").toLowerCase();
  if (adminEmails.length === 0) {
    if (process.env.NODE_ENV === "production") {
      redirect("/");
    }
  } else {
    if (!email || !adminEmails.includes(email)) {
      redirect("/");
    }
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-800 text-white p-4">
        <h1 className="text-2xl font-bold mb-8">Admin Panel</h1>
        <nav>
          <ul>
            <li className="mb-4">
              <Link href="/admin" className="hover:text-gray-300">
                Dashboard
              </Link>
            </li>
            <li className="mb-4">
              <Link href="/admin/console" className="hover:text-gray-300">
                Admin Console
              </Link>
            </li>
            <li className="mb-4">
              <Link href="/admin/products" className="hover:text-gray-300">
                Products
              </Link>
            </li>
            <li className="mb-4">
              <Link href={("/admin/products/import" as Route)} className="hover:text-gray-300">
                Import Products (CSV)
              </Link>
            </li>
            <li className="mb-4">
              <Link href={("/admin/pricing" as Route)} className="hover:text-gray-300">
                Pricing Calculator
              </Link>
            </li>
            <li className="mb-4">
              <Link href="/admin/blog" className="hover:text-gray-300">
                Blog
              </Link>
            </li>
            <li>
              <Link href="/admin/orders" className="hover:text-gray-300">
                Orders
              </Link>
            </li>
          </ul>
        </nav>
      </aside>
      <main className="flex-1 p-8 bg-gray-100">
        {children}
      </main>
    </div>
  );
}
