import Link from "next/link";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
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

export default async function UserNav() {
  const hasSupabaseEnv = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!hasSupabaseEnv) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">تسجيل الدخول</Link>
        </Button>
        <Button asChild variant="gradient" size="sm">
          <Link href="/sign-up">إنشاء حساب</Link>
        </Button>
      </div>
    );
  }

  try {
    const supabase = createServerComponentClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      const email = (session.user?.email || "").toLowerCase();
      const adminEmails = (process.env.ADMIN_EMAILS || "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      const isAdmin = adminEmails.length > 0 && email && adminEmails.includes(email);
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
                <p className="text-xs leading-none text-muted-foreground">
                  {session.user?.email}
                </p>
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
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin">لوحة التحكم</Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <SignOutButton />
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
  } catch (e) {
    console.error("UserNav: failed to init Supabase or fetch session", e);
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size="sm">
        <Link href="/login">تسجيل الدخول</Link>
      </Button>
      <Button asChild variant="gradient" size="sm">
        <Link href="/sign-up">إنشاء حساب</Link>
      </Button>
    </div>
  );
}
