import Link from "next/link";
import Logo from "@/components/logo";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { getCart } from "@/lib/cart-actions";
import { ShoppingCart } from "lucide-react";
import MobileNav from "./mobile-nav";

export default async function Header() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  const cart = await getCart();
  const totalQuantity = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Note: Mobile menu state will be handled separately
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" aria-label="Shopixo home" className="flex items-center gap-2">
            <Logo />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/" className="hover:text-brand">Home</Link>
            <Link href="/shop" className="hover:text-brand">Shop</Link>
            <Link href="/about" className="hover:text-brand">About</Link>
            <Link href="/contact" className="hover:text-brand">Contact</Link>
            <Link href="/faq" className="hover:text-brand">FAQ</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <form action="/search" className="hidden sm:block">
            <input
              name="q"
              placeholder="Search products..."
              className="w-56 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </form>
          <Link
            href="/cart"
            className="relative rounded-md px-3 py-2 text-sm font-medium hover:text-brand"
          >
            <ShoppingCart className="h-5 w-5" />
            {totalQuantity > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-xs text-white">
                {totalQuantity}
              </span>
            )}
            <span className="sr-only">Cart, {totalQuantity} items</span>
          </Link>
          {session ? (
            <>
              <Link href={'/admin' as any} className="rounded-md px-3 py-2 text-sm font-medium hover:text-brand">
                Admin
              </Link>
              <form action="/auth/signout" method="post">
                <button type="submit" className="rounded-md px-3 py-2 text-sm font-medium hover:text-brand">
                  Sign Out
                </button>
              </form>
            </>
          ) : (
            <Link href={'/login' as any} className="rounded-md px-3 py-2 text-sm font-medium hover:text-brand">
              Log In
            </Link>
          )}
          <MobileNav />
        </div>
      </div>
          </header>
  );
}
