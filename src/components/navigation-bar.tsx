import Link from "next/link";
import type { Route } from "next";

const MENU: { href: string; label: string }[] = [
  { href: "/shop", label: "المتجر" },
  { href: "/collections", label: "المجموعات" },
  { href: "/bestsellers", label: "الأكثر مبيعًا" },
  { href: "/new-arrivals", label: "وصل حديثًا" },
  { href: "/about", label: "من نحن" },
  { href: "/contact", label: "اتصل بنا" },
];

export default async function NavigationBar() {
  return (
    <nav className="hidden md:block border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex items-center justify-start gap-6 py-2 text-sm font-medium text-muted-foreground overflow-x-auto whitespace-nowrap" dir="rtl">
        {MENU.map((m) => (
          <Link key={m.href} href={m.href as Route} className="transition-colors hover:text-foreground">
            {m.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
