"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SignOutButton from "./sign-out-button";
import { getSupabaseBrowser } from "@/lib/supabase";

export default function UserNav() {
  const hasSupabaseEnv = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(hasSupabaseEnv);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    if (!hasSupabaseEnv) return;
    let mounted = true;
    const supabase = getSupabaseBrowser();
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        setEmail(session?.user?.email ?? null);
      } catch (e) {
        console.error("UserNav(client): failed to fetch session", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [hasSupabaseEnv]);

  // Detect admin by probing a protected admin route
  useEffect(() => {
    let aborted = false;
    async function checkAdmin() {
      try {
        if (!email) {
          setIsAdmin(false);
          return;
        }
        const r = await fetch('/api/admin/settings', { cache: 'no-store' });
        if (!aborted) setIsAdmin(r.ok);
      } catch {
        if (!aborted) setIsAdmin(false);
      }
    }
    checkAdmin();
    return () => { aborted = true };
  }, [email]);

  if (!hasSupabaseEnv) {
    // Compact UX on mobile, full buttons on md+
    return (
      <div className="flex items-center gap-2">
        {/* Mobile: icon-only */}
        <div className="md:hidden">
          <Button asChild variant="ghost" size="icon" aria-label="تسجيل الدخول">
            <Link href="/login">
              <User className="h-5 w-5" />
            </Link>
          </Button>
        </div>
        {/* Desktop: text buttons */}
        <div className="hidden md:flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">تسجيل الدخول</Link>
          </Button>
          <Button asChild variant="cta" size="sm">
            <Link href="/sign-up">إنشاء حساب</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-muted" aria-hidden />;
  }

  if (email) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
            <User className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">حسابي</p>
              <p className="text-xs leading-none text-muted-foreground">{email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/account">نظرة عامة</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/account/orders">الطلبات</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/account/addresses">العناوين</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/account/coupons">القسائم</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/account/reviews">المراجعات</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/account/security">الأمان</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/account/notifications">الإشعارات</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isAdmin && (
            <DropdownMenuItem asChild>
              <Link href="/admin/console">لوحة التحكم</Link>
            </DropdownMenuItem>
          )}
          {isAdmin && <DropdownMenuSeparator />}
          <SignOutButton />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Logged out (Supabase active): compact on mobile, full buttons on md+
  return (
    <div className="flex items-center gap-2">
      {/* Mobile: icon-only */}
      <div className="md:hidden">
        <Button asChild variant="ghost" size="icon" aria-label="تسجيل الدخول">
          <Link href="/login">
            <User className="h-5 w-5" />
          </Link>
        </Button>
      </div>
      {/* Desktop: text buttons */}
      <div className="hidden md:flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">تسجيل الدخول</Link>
        </Button>
        <Button asChild variant="cta" size="sm">
          <Link href="/sign-up">إنشاء حساب</Link>
        </Button>
      </div>
    </div>
  );
}
