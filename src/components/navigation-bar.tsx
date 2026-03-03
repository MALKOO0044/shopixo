import Link from "next/link";
import type { Route } from "next";

const MENU: { href: string; label: string }[] = [
  { href: "/shop", label: "Shop" },
  { href: "/collections", label: "Collections" },
  { href: "/bestsellers", label: "Bestsellers" },
  { href: "/new-arrivals", label: "New Arrivals" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

export default async function NavigationBar() {
  return (
    <nav className="hidden md:block border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex items-center justify-start gap-6 py-2 text-sm font-medium text-muted-foreground overflow-x-auto whitespace-nowrap">
        {MENU.map((m) => (
          <Link key={m.href} href={m.href as Route} className="transition-colors hover:text-foreground">
            {m.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
