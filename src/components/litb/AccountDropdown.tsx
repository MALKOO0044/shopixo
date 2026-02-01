"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Package, Heart, FileText, Gift, Ticket, Settings, LogOut } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Route } from "next";

export default function AccountDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    async function getUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (e) {
        console.error("Auth error:", e);
      } finally {
        setLoading(false);
      }
    }
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const menuItems = [
    { href: "/account/orders", label: "My Orders", icon: Package },
    { href: "/account/favorites", label: "My Favorites", icon: Heart },
    { href: "/account/service", label: "Service Record", icon: FileText },
    { href: "/account/rewards", label: "My Rewards & Credit", icon: Gift },
    { href: "/account/coupons", label: "My Coupons", icon: Ticket },
  ];

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        className="flex items-center gap-1 text-sm hover:text-[#e31e24] cursor-pointer"
        onClick={() => router.push(user ? "/account" : "/login")}
      >
        <User className="h-5 w-5" />
        {loading ? (
          <span className="w-12 h-4 bg-gray-100 animate-pulse rounded"></span>
        ) : user ? (
          <span className="font-medium uppercase">{userName.slice(0, 10)}</span>
        ) : (
          <span className="font-medium">SIGN IN</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full pt-2 z-[70]">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-[220px] py-3 max-h-[70vh] overflow-y-auto">
            {user ? (
              <>
                <div className="px-4 pb-3 border-b border-gray-100">
                  <p className="text-sm text-gray-600">Hi, {userName}</p>
                </div>

                <div className="py-2">
                  {menuItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href as Route}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#e31e24]"
                    >
                      <item.icon className="h-4 w-4 text-gray-400" />
                      {item.label}
                    </Link>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-2">
                  <Link
                    href={"/account/settings" as Route}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#e31e24]"
                  >
                    <Settings className="h-4 w-4 text-gray-400" />
                    Account Setting
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#e31e24] w-full text-left"
                  >
                    <LogOut className="h-4 w-4 text-gray-400" />
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="px-4 pb-3">
                  <p className="text-sm text-gray-600 mb-3">Welcome to Shopixo</p>
                  <Link
                    href={"/sign-up" as Route}
                    className="block w-full bg-[#e31e24] text-white text-center py-2.5 rounded-md text-sm font-medium hover:bg-[#c91920] transition-colors"
                  >
                    Register / Sign In
                  </Link>
                </div>

                <div className="border-t border-gray-100 pt-2">
                  {menuItems.map((item) => (
                    <Link
                      key={item.href}
                      href={"/login" as Route}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#e31e24]"
                    >
                      <item.icon className="h-4 w-4 text-gray-400" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
