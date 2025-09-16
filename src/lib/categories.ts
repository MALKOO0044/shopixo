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

// Rich dataset for menus with images and optional children
export type FullCategoryChild = { slug: string; label: string; image?: string };

export type FullCategory = {
  slug: string;
  label: string;
  image?: string; // Square or 4:3 works best
  children?: FullCategoryChild[];
};

export const FULL_CATEGORIES: FullCategory[] = [
  {
    slug: "women",
    label: "ملابس نسائية",
    image: "https://images.unsplash.com/photo-1520975922203-c50191a1d254?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "women-dresses", label: "فساتين", image: "https://images.unsplash.com/photo-1487412912498-0447578fcca8?q=80&w=640&auto=format&fit=crop" },
      { slug: "women-long-dresses", label: "فساتين طويلة", image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=640&auto=format&fit=crop" },
      { slug: "women-midi-dresses", label: "فساتين ميدي", image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=640&auto=format&fit=crop" },
      { slug: "women-mini-dresses", label: "فساتين قصيرة", image: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=640&auto=format&fit=crop" },
      { slug: "women-tops", label: "توبات وبلوزات", image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=640&auto=format&fit=crop" },
      { slug: "women-bottoms", label: "بناطيل وتنانير", image: "https://images.unsplash.com/photo-1514995669114-b7d2c6bab1b8?q=80&w=640&auto=format&fit=crop" },
      { slug: "women-outerwear", label: "جاكيتات ومعاطف", image: "https://images.unsplash.com/photo-1517805686688-47dd930554b9?q=80&w=640&auto=format&fit=crop" },
      { slug: "women-lingerie", label: "ملابس داخلية ونوم", image: "https://images.unsplash.com/photo-1544198365-bc2c5d0b79e3?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "men",
    label: "الملابس الرجالية",
    image: "https://images.unsplash.com/photo-1516826957135-700dedea698c?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "men-tops", label: "تيشرتات وقمصان", image: "https://images.unsplash.com/photo-1451417379553-15d8e8f49cde?q=80&w=640&auto=format&fit=crop" },
      { slug: "men-bottoms", label: "جينز وبناطيل", image: "https://images.unsplash.com/photo-1503342217505-b0a15cf70489?q=80&w=640&auto=format&fit=crop" },
      { slug: "men-outerwear", label: "جاكيتات ومعاطف", image: "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?q=80&w=640&auto=format&fit=crop" },
      { slug: "men-active", label: "ملابس رياضية", image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "plus-size",
    label: "مقاسات كبيرة",
    image: "https://images.unsplash.com/photo-1520975657285-8bdf1a7a237f?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "plus-dresses", label: "فساتين", image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=640&auto=format&fit=crop" },
      { slug: "plus-tops", label: "بلوزات وتوبات", image: "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=640&auto=format&fit=crop" },
      { slug: "plus-bottoms", label: "جينز وبناطيل", image: "https://images.unsplash.com/photo-1503342394128-c104d54dba01?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "kids",
    label: "الأطفال",
    image: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "kids-girls", label: "بنات", image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=640&auto=format&fit=crop" },
      { slug: "kids-boys", label: "أولاد", image: "https://images.unsplash.com/photo-1522770179533-24471fcdba45?q=80&w=640&auto=format&fit=crop" },
      { slug: "kids-baby", label: "رضّع", image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=640&auto=format&fit=crop" },
      { slug: "kids-toys", label: "ألعاب", image: "https://images.unsplash.com/photo-1526045612212-70caf35c14df?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "underwear-sleepwear",
    label: "ملابس داخلية، وملابس نوم",
    image: "https://images.unsplash.com/photo-1544198365-bc2c5d0b79e3?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "bras", label: "صدريات", image: "https://images.unsplash.com/photo-1556306520-70563a1955e0?q=80&w=640&auto=format&fit=crop" },
      { slug: "panties", label: "سراويل داخلية", image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=640&auto=format&fit=crop" },
      { slug: "sleepwear", label: "ملابس نوم", image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "jewelry-accessories",
    label: "مجوهرات واكسسوارات",
    image: "https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "rings", label: "خواتم", image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=640&auto=format&fit=crop" },
      { slug: "necklaces", label: "عقود", image: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?q=80&w=640&auto=format&fit=crop" },
      { slug: "bracelets", label: "أساور", image: "https://images.unsplash.com/photo-1475180098004-ca77a66827be?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "bags-luggage",
    label: "الحقائب والأمتعة",
    image: "https://images.unsplash.com/photo-1512203492609-8c3ea6bfbf2a?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "handbags", label: "حقائب يد", image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?q=80&w=640&auto=format&fit=crop" },
      { slug: "backpacks", label: "شنط ظهر", image: "https://images.unsplash.com/photo-1502920917128-1aa500764b8a?q=80&w=640&auto=format&fit=crop" },
      { slug: "travel-bags", label: "حقائب سفر", image: "https://images.unsplash.com/photo-1519721138087-5f6b6a61f7f4?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "shoes",
    label: "أحذية",
    image: "https://images.unsplash.com/photo-1527010154944-f2241763d806?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "sneakers", label: "أحذية رياضية", image: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=640&auto=format&fit=crop" },
      { slug: "heels", label: "كعب عالي", image: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=640&auto=format&fit=crop" },
      { slug: "boots", label: "بوتس", image: "https://images.unsplash.com/photo-1534214526114-0ea4d47b04f2?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "sports-outdoor",
    label: "الرياضة والأنشطة الخارجية",
    image: "https://images.unsplash.com/photo-1502920917128-1aa500764b8a?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "fitness", label: "معدات لياقة", image: "https://images.unsplash.com/photo-1519311965067-36d3e5f2a0f8?q=80&w=640&auto=format&fit=crop" },
      { slug: "outdoor", label: "رحلات خارجية", image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "health-beauty",
    label: "الصحة و الجمال",
    image: "https://images.unsplash.com/photo-1500835556837-99ac94a94552?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "makeup", label: "مكياج", image: "https://images.unsplash.com/photo-1512203492609-8c3ea6bfbf2a?q=80&w=640&auto=format&fit=crop" },
      { slug: "skincare", label: "العناية بالبشرة", image: "https://images.unsplash.com/photo-1505577058444-a3dab90d4253?q=80&w=640&auto=format&fit=crop" },
      { slug: "haircare", label: "العناية بالشعر", image: "https://images.unsplash.com/photo-1512203492609-8c3ea6bfbf2a?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "home-kitchen",
    label: "المنزل والمطبخ",
    image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "kitchen-tools", label: "أدوات المطبخ", image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=640&auto=format&fit=crop" },
      { slug: "storage", label: "تخزين وتنظيم", image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=640&auto=format&fit=crop" },
      { slug: "home-decor", label: "ديكور منزلي", image: "https://images.unsplash.com/photo-1505692794403-34d4982b57a4?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "home-textiles",
    label: "منسوجات منزلية",
    image: "https://images.unsplash.com/photo-1505692794403-34d4982b57a4?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "bedding", label: "مفارش سرير", image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=640&auto=format&fit=crop" },
      { slug: "duvets", label: "أغطية لحاف", image: "https://images.unsplash.com/photo-1560066984-138dad5d8a1a?q=80&w=640&auto=format&fit=crop" },
      { slug: "pillows", label: "أغطية وسائد", image: "https://images.unsplash.com/photo-1523473827532-6a27c5f3e83b?q=80&w=640&auto=format&fit=crop" },
      { slug: "curtains", label: "ستائر", image: "https://images.unsplash.com/photo-1625753388254-89d78f84490d?q=80&w=640&auto=format&fit=crop" },
      { slug: "towels", label: "مناشف", image: "https://images.unsplash.com/photo-1621259182978-6a5f7e75abb1?q=80&w=640&auto=format&fit=crop" },
      { slug: "sofa-covers", label: "أغطية أريكة", image: "https://images.unsplash.com/photo-1520881363902-a0ff4e722963?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "appliances",
    label: "أجهزة",
    image: "https://images.unsplash.com/photo-1556911073-52527ac437e9?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "toasters", label: "محمصات", image: "https://images.unsplash.com/photo-1556909114-16f7e0d3b2b6?q=80&w=640&auto=format&fit=crop" },
      { slug: "mixers", label: "خلاطات", image: "https://images.unsplash.com/photo-1514511542834-0030b6c4b6c9?q=80&w=640&auto=format&fit=crop" },
      { slug: "coffee", label: "قهوة وشاي", image: "https://images.unsplash.com/photo-1507133750040-4a8f57021524?q=80&w=640&auto=format&fit=crop" },
      { slug: "scales", label: "موازين مطبخ", image: "https://images.unsplash.com/photo-1526318472351-c75fcf070305?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "electronics",
    label: "إلكترونيات",
    image: "https://images.unsplash.com/photo-1517059224940-d4af9eec41e5?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "headphones", label: "سماعات", image: "https://images.unsplash.com/photo-1517059224940-d4af9eec41e5?q=80&w=640&auto=format&fit=crop" },
      { slug: "smartwatches", label: "ساعات ذكية", image: "https://images.unsplash.com/photo-1517059224940-d4af9eec41e5?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "mobile-accessories",
    label: "هواتف خليوية & إكسسوارات",
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "cases", label: "أغطية", image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=640&auto=format&fit=crop" },
      { slug: "chargers", label: "شواحن", image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=640&auto=format&fit=crop" },
      { slug: "cables", label: "كابلات", image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  { slug: "toys", label: "الألعاب", image: "https://images.unsplash.com/photo-1526045612212-70caf35c14df?q=80&w=640&auto=format&fit=crop" },
  {
    slug: "office-school",
    label: "مستلزمات مكتبية ومدرسية",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "notebooks", label: "دفاتر", image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=640&auto=format&fit=crop" },
      { slug: "pens", label: "أقلام", image: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=640&auto=format&fit=crop" },
      { slug: "arts", label: "أدوات فنية", image: "https://images.unsplash.com/photo-1503602642458-232111445657?q=80&w=640&auto=format&fit=crop" },
      { slug: "organizers", label: "منظّم مكتب", image: "https://images.unsplash.com/photo-1526378722484-bd91ca387e72?q=80&w=640&auto=format&fit=crop" },
      { slug: "back-to-school", label: "لوازم العودة للمدرسة", image: "https://images.unsplash.com/photo-1596495578065-8aa78f7f6d97?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "tools-home-improvement",
    label: "أدوات وتحسين المنزل",
    image: "https://images.unsplash.com/photo-1581090700227-1e37b190418e?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "hand-tools", label: "أدوات يدوية", image: "https://images.unsplash.com/photo-1516279782263-3e1c9b9b6ff1?q=80&w=640&auto=format&fit=crop" },
      { slug: "maintenance", label: "لوازم الصيانة", image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=640&auto=format&fit=crop" },
      { slug: "power-tools", label: "أدوات كهربائية", image: "https://images.unsplash.com/photo-1508898578281-774ac4893a54?q=80&w=640&auto=format&fit=crop" },
      { slug: "wall-stickers", label: "ملصقات جدارية", image: "https://images.unsplash.com/photo-1495555687393-4c0c44f9b6d6?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "automotive",
    label: "السيارات",
    image: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "car-accessories", label: "إكسسوارات", image: "https://images.unsplash.com/photo-1519773014688-8f19cf8b4cf1?q=80&w=640&auto=format&fit=crop" },
      { slug: "organizers", label: "منظمات داخل السيارة", image: "https://images.unsplash.com/photo-1534237710431-e2fc698436d0?q=80&w=640&auto=format&fit=crop" },
      { slug: "seat-covers", label: "أغطية مقاعد", image: "https://images.unsplash.com/photo-1596367407372-96f5c53f5332?q=80&w=640&auto=format&fit=crop" },
      { slug: "floor-mats", label: "فرش أرضيات", image: "https://images.unsplash.com/photo-1541447271676-15612e1d8b66?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "pet-supplies",
    label: "مستلزمات الحيوانات الأليفة",
    image: "https://images.unsplash.com/photo-1543852786-1cf6624b9987?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "bowls", label: "أطباق طعام", image: "https://images.unsplash.com/photo-1516726817505-f5ed825624d8?q=80&w=640&auto=format&fit=crop" },
      { slug: "toys", label: "ألعاب", image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=640&auto=format&fit=crop" },
      { slug: "beds", label: "فرش وسجاد", image: "https://images.unsplash.com/photo-1568641076734-1b7b7f2f9ab3?q=80&w=640&auto=format&fit=crop" },
      { slug: "collars", label: "أطواق", image: "https://images.unsplash.com/photo-1584060082397-7f92b2185a7f?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "baby-maternity",
    label: "الأطفال والأمومة",
    image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "baby-clothes", label: "ملابس الرضع", image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=640&auto=format&fit=crop" },
      { slug: "nursing", label: "مستلزمات الرضاعة", image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=640&auto=format&fit=crop" },
      { slug: "strollers", label: "عربات أطفال", image: "https://images.unsplash.com/photo-1595436252086-247d68c3dc1b?q=80&w=640&auto=format&fit=crop" },
      { slug: "pregnancy", label: "ملابس حمل ورضاعة", image: "https://images.unsplash.com/photo-1614369123778-5e6468d4bcee?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  { slug: "sale", label: "تخفيض الأسعار", image: "https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=640&auto=format&fit=crop" },
  { slug: "new-in", label: "جديد في", image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=640&auto=format&fit=crop" },
  { slug: "general", label: "عام", image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=640&auto=format&fit=crop" },
];
