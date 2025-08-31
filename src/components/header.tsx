import Link from "next/link";
import Logo from "@/components/logo";
import UserNav from "./user-nav";
import SearchBar from "./search-bar";
import CartBadge from "./cart-badge";
import { ThemeToggle } from "./theme-toggle";

// Trigger new deployment
export default function Header() {

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
        <div className="flex flex-1 justify-center px-4 sm:px-8 lg:px-16">
          <SearchBar />
        </div>

        {/* Right: Icons */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <UserNav />
          <CartBadge />
        </div>
      </div>
    </header>
  );
}
