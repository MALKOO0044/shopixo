import Link from "next/link";
import { ReactNode } from "react";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/account");
  }

  const navItems = [
    { href: { pathname: "/account" }, label: "Overview" },
    { href: { pathname: "/account/orders" }, label: "Orders" },
    { href: { pathname: "/account/addresses" }, label: "Addresses" },
    { href: { pathname: "/account/coupons" }, label: "Coupons" },
    { href: { pathname: "/account/reviews" }, label: "Reviews" },
    { href: { pathname: "/account/security" }, label: "Security" },
    { href: { pathname: "/account/notifications" }, label: "Notifications" },
  ];

  return (
    <div className="container mx-auto py-8">
      {/* Mobile: compact header + horizontal chips nav */}
      <div className="md:hidden space-y-3 mb-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">Signed in as</p>
          <p className="font-semibold truncate">{user.email}</p>
        </div>
        <nav className="overflow-x-auto whitespace-nowrap">
          <ul className="flex items-center gap-2">
            {navItems.map((item) => (
              <li key={item.label}>
                <Link
                  className="inline-block rounded-full border px-3 py-1.5 text-sm text-foreground/80 hover:text-foreground bg-white"
                  href={item.href}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Desktop/Tablet: sticky sidebar */}
        <aside className="hidden md:block md:col-span-3 bg-white rounded-lg border p-4 h-fit sticky top-6">
          <div className="mb-6">
            <p className="text-sm text-gray-500">Signed in as</p>
            <p className="font-semibold truncate">{user.email}</p>
          </div>
          <nav>
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.label}>
                  <Link className="block w-full px-3 py-2 rounded hover:bg-gray-100" href={item.href}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <main className="md:col-span-9">{children}</main>
      </div>
    </div>
  );
}
