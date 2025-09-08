export type CategoryDef = { slug: string; label: string };

export const CATEGORIES: CategoryDef[] = [
  { slug: "general", label: "عام" },
  { slug: "new-in", label: "جديد في" },
  { slug: "sale", label: "تخفيض الأسعار" },
  { slug: "women", label: "ملابس نسائية" },
  { slug: "plus-size", label: "مقاسات كبيرة" },
  { slug: "kids", label: "الأطفال" },
  { slug: "men", label: "الملابس الرجالية" },
  { slug: "underwear-sleepwear", label: "ملابس داخلية، وملابس نوم" },
  { slug: "home-kitchen", label: "المنزل والمطبخ" },
  { slug: "shoes", label: "أحذية" },
  { slug: "health-beauty", label: "الصحة و الجمال" },
  { slug: "baby-maternity", label: "الأطفال والأمومة" },
  { slug: "jewelry-accessories", label: "مجوهرات واكسسوارات" },
  { slug: "bags-luggage", label: "الحقائب والأمتعة" },
  { slug: "sports-outdoor", label: "الرياضة والأنشطة الخارجية" },
  { slug: "home-textiles", label: "منسوجات منزلية" },
  { slug: "toys", label: "الألعاب" },
  { slug: "tools-home-improvement", label: "أدوات وتحسين المنزل" },
  { slug: "office-school", label: "مستلزمات مكتبية ومدرسية" },
  { slug: "mobile-accessories", label: "هواتف خليوية & إكسسوارات" },
  { slug: "electronics", label: "إلكترونيات" },
  { slug: "appliances", label: "أجهزة" },
  { slug: "automotive", label: "السيارات" },
  { slug: "pet-supplies", label: "مستلزمات الحيوانات الأليفة" },
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
