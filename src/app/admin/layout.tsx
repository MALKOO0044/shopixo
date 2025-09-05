import Link from "next/link";
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
    redirect("/login?redirect=/admin");
  }

  // Optional: enforce role-based access via ADMIN_EMAILS (comma-separated)
  // If ADMIN_EMAILS is defined, only those emails can access /admin
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.length > 0) {
    const email = (user.email || "").toLowerCase();
    if (!email || !adminEmails.includes(email)) {
      // Not authorized for admin panel
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
              <Link href="/admin/products" className="hover:text-gray-300">
                Products
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
