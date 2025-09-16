import Link from "next/link";
import Logo from "@/components/logo";
import UserNav from "./user-nav";
import SearchBar from "./search-bar";
import CartBadge from "./cart-badge";
import { Suspense } from "react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import CategoriesMenu from "@/components/categories-menu";

// Trigger new deployment
export default function Header() {
  const name = process.env.NEXT_PUBLIC_STORE_NAME || "Shopixo";
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center overflow-hidden">
        {/* Left: Logo (desktop/tablet only) */}
        <div className="hidden md:flex items-center gap-2">
          {/* Logo component already renders a Link to home */}
          <Logo />
          {/* Desktop: open categories menu */}
          <CategoriesMenu />
        </div>

        {/* Center: Search Bar (desktop/tablet) */}
        <div className="hidden flex-1 justify-center px-4 sm:px-8 lg:flex lg:px-16">
          <Suspense fallback={null}>
            <SearchBar />
          </Suspense>
        </div>

        {/* Mobile: exact layout — right brand text, center search pill, left 3 icons */}
        <div className="grid w-full grid-cols-[auto_minmax(0,_1fr)_auto] items-center gap-2 md:hidden">
          {/* Right (start in RTL): brand text only */}
          <div className="justify-self-start min-w-0">
            <Link href="/" className="block truncate text-2xl md:text-3xl leading-none font-semibold tracking-tight">{name}</Link>
          </div>
          {/* Center: search pill (placeholder like Temu) */}
          <div className="justify-self-center w-full flex items-center justify-center">
            <Link
              href="/search"
              aria-label="ابحث عن المنتجات"
              className="inline-flex w-[230px] items-center flex-row-reverse gap-2 rounded-full bg-muted px-8 py-2.5 text-[16px] text-muted-foreground"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M10 3.75a6.25 6.25 0 104.76 10.41l3.54 3.54a.75.75 0 101.06-1.06l-3.54-3.54A6.25 6.25 0 0010 3.75zm-4.75 6.25a4.75 4.75 0 119.5 0 4.75 4.75 0 01-9.5 0z" clipRule="evenodd" />
              </svg>
              <span>ألعاب</span>
            </Link>
          </div>
          {/* Left (end in RTL): three icons — cart, user, menu */}
          <div className="justify-self-end flex items-center gap-2">
            <CartBadge />
            <UserNav />
            <CategoriesMenu />
          </div>
        </div>

        {/* Right: CTA + Icons (desktop/tablet only) */}
        <div className="ml-auto hidden md:flex items-center gap-2 sm:gap-4 flex-wrap overflow-hidden">
          {/* Desktop CTA */}
          <Link href="/shop" className="hidden md:inline-flex">
            <Button variant="cta" size="default" aria-label="تسوّق الآن">
              تسوّق الآن
            </Button>
          </Link>
          {/* Mobile menu is handled inside the left group above via <CategoriesMenu /> */}
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          <UserNav />
          <CartBadge />
        </div>
      </div>
      {/* No separate mobile pill row; pill is integrated above */}
    </header>
  );
}
