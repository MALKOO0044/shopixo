import Link from "next/link";
import Logo from "@/components/logo";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { getCart } from "@/lib/cart-actions";
import { ShoppingCart, User, Search } from "lucide-react";

export default async function Header() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  const cart = await getCart();
  const totalQuantity = cart?.reduce((acc, item) => acc + item.quantity, 0) ?? 0;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center">
        {/* Left: Logo */}
        <div className="flex items-center">
          <Link href="/" aria-label="Shopixo home">
            <Logo />
          </Link>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 px-4 sm:px-8 lg:px-16">
          <form action="/search" className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              name="q"
              placeholder="Search for products..."
              className="w-full rounded-full border bg-muted/50 py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </form>
        </div>

        {/* Right: Icons */}
        <div className="flex items-center gap-4">
          <Link href={session ? '/admin' : '/login'} className="flex items-center gap-2 text-sm font-medium hover:text-primary">
            <User className="h-6 w-6" />
          </Link>
          <Link
            href="/cart"
            className="relative flex items-center gap-2 text-sm font-medium hover:text-primary"
          >
            <ShoppingCart className="h-6 w-6" />
            {totalQuantity > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {totalQuantity}
              </span>
            )}
            <span className="sr-only">Cart, {totalQuantity} items</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
