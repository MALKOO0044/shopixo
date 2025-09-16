import Link from "next/link";
import Logo from "@/components/logo";
import UserNav from "./user-nav";
import SearchBar from "./search-bar";
import CartBadge from "./cart-badge";
import { Suspense } from "react";
import { ThemeToggle } from "./theme-toggle";
import SearchModal from "./search-modal";
import { Button } from "@/components/ui/button";

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
          {/* Mobile search trigger */}
          <SearchModal />
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          <UserNav />
          <CartBadge />
        </div>
      </div>
    </header>
  );
}
