import { ReactNode } from "react";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLayoutClient } from "./AdminLayoutClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    <AdminLayoutClient email={email}>
      {children}
    </AdminLayoutClient>
  );
}
