import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function isAdminUser(): Promise<{ isAdmin: boolean; email: string | null }> {
  try {
    const supabase = createServerComponentClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { isAdmin: false, email: null };
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

    if (adminEmails.length === 0 && adminDomains.length === 0) {
      return { isAdmin: true, email };
    }

    const matchesEmail = email && adminEmails.includes(email);
    const matchesDomain = email.includes("@") && adminDomains.includes(email.split("@")[1]);
    
    return { 
      isAdmin: matchesEmail || matchesDomain, 
      email 
    };
  } catch (e: any) {
    console.error('[Admin Check] Error:', e?.message);
    return { isAdmin: false, email: null };
  }
}
