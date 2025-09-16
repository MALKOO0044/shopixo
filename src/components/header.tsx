import Link from "next/link";
import Logo from "@/components/logo";
import UserNav from "./user-nav";
import SearchBar from "./search-bar";
import CartBadge from "./cart-badge";
import { Suspense } from "react";
import { ThemeToggle } from "./theme-toggle";
import SearchModal from "./search-modal";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

// Trigger new deployment
export default function Header() {

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center overflow-hidden">
        {/* Left: Logo */}
        <div className="flex items-center">
          {/* Logo component already renders a Link to home */}
          <Logo />
        </div>

        {/* Center: Search Bar (hidden on small screens) */}
        <div className="hidden flex-1 justify-center px-4 sm:px-8 lg:flex lg:px-16">
          <Suspense fallback={null}>
            <SearchBar />
          </Suspense>
        </div>

        {/* Right: CTA + Icons */}
        <div className="ml-auto flex items-center gap-2 sm:gap-4 flex-wrap overflow-hidden">
          {/* Desktop CTA */}
          <Link href="/shop" className="hidden md:inline-flex">
            <Button variant="cta" size="default" aria-label="تسوّق الآن">
              تسوّق الآن
            </Button>
          </Link>
          {/* Mobile: quick icons */}
          <Link href="/collections" aria-label="القوائم" className="inline-flex md:hidden rounded-md border p-2 hover:bg-muted">
            <Menu className="h-5 w-5" />
          </Link>
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          <UserNav />
          <CartBadge />
        </div>
      </div>
      {/* Mobile search pill (full width, like Temu) */}
      <div className="md:hidden border-b bg-background/95">
        <div className="container py-2">
          <Link
            href="/search"
            aria-label="ابحث عن المنتجات"
            className="flex w-full items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M10 3.75a6.25 6.25 0 104.76 10.41l3.54 3.54a.75.75 0 101.06-1.06l-3.54-3.54A6.25 6.25 0 0010 3.75zm-4.75 6.25a4.75 4.75 0 119.5 0 4.75 4.75 0 01-9.5 0z" clipRule="evenodd" />
            </svg>
            <span className="flex-1 text-right">ابحث في Shopixo</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
