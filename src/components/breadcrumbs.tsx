import Link from "next/link";
import { type Route } from "next";

export type Crumb = { name: string; href?: Route };

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-center gap-2">
            {idx > 0 && <span className="opacity-50">/</span>}
            {item.href ? (
              <Link className="hover:text-foreground" href={item.href}>{item.name}</Link>
            ) : (
              <span className="text-foreground">{item.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
