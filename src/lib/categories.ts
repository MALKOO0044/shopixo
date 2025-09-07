export type CategoryDef = { slug: string; label: string };

export const CATEGORIES: CategoryDef[] = [
  { slug: "general", label: "General" },
  { slug: "fashion", label: "Fashion" },
  { slug: "electronics", label: "Electronics" },
  { slug: "home", label: "Home" },
  { slug: "beauty", label: "Beauty" },
  { slug: "sports", label: "Sports" },
  { slug: "toys", label: "Toys" },
  { slug: "automotive", label: "Automotive" },
  { slug: "books", label: "Books" },
  { slug: "groceries", label: "Groceries" },
];

export function labelFromSlug(slug: string): string |
  undefined {
  const s = (slug || "").trim().toLowerCase();
  const found = CATEGORIES.find((c) => c.slug === s);
  return found?.label;
}

export function slugFromLabel(label: string): string {
  const l = (label || "").trim();
  const exact = CATEGORIES.find((c) => c.label.toLowerCase() === l.toLowerCase());
  if (exact) return exact.slug;
  return l.toLowerCase().replace(/\s+/g, "-");
}
