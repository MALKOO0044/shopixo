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
    image: "https://images.unsplash.com/photo-1572804013427-4d7ca7268211?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "women-coats", label: "معاطف وسترات نسائية", image: "https://res.cloudinary.com/dkwh8kbgr/image/upload/v1758126604/17defd5f299efa43102b8c7602fe8a00_zpcjw6_tc8uja.jpg" },
      { slug: "women-tshirts", label: "تيشيرتات للنساء", image: "https://res.cloudinary.com/dkwh8kbgr/image/upload/v1758126646/photo-1710954962775-c46bd6a5f67f_k8r0jx.avif" },
      { slug: "women-dresses", label: "فساتين للنساء", image: "https://res.cloudinary.com/dkwh8kbgr/image/upload/v1758126954/photo-1739544252344-85d230322e9d_ncjqbc.avif" },
      { slug: "women-sweaters", label: "كنزات نسائية", image: "https://res.cloudinary.com/dkwh8kbgr/image/upload/v1758130336/photo-1687275168955-aacd8bba29cf_sg1zgn.avif" },
      { slug: "women-two-piece-sets", label: "أطقم نسائية من قطعتين", image: "https://res.cloudinary.com/dkwh8kbgr/image/upload/v1758131359/photo-1613419489076-15da367b38df_jrregr.avif" },
      { slug: "women-blouses-shirts", label: "بلوزات وقمصان للنساء", image: "https://res.cloudinary.com/dkwh8kbgr/image/upload/v1758131516/premium_photo-1669559419417-f2ef4227afbe_sfuubu.avif" },
      { slug: "women-trousers", label: "بناطيل للنساء", image: "https://res.cloudinary.com/dkwh8kbgr/image/upload/v1758131654/photo-1561104726-210cbc28c2eb_juck5q.avif" },
      { slug: "women-jeans", label: "جينز للنساء", image: "https://res.cloudinary.com/dkwh8kbgr/image/upload/v1758131792/photo-1632852301634-96b856283a5e_hvajjy.avif" },
      { slug: "women-hoodies-sweatshirts", label: "هوديز وسويتشيرت للنساء", image: "https://images.unsplash.com/photo-1556306535-0f694a20e24b?q=80&w=640&auto=format&fit=crop" },
      { slug: "women-sportswear", label: "ملابس رياضية للنساء", image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=640&auto=format&fit=crop" },
      { slug: "women-skirts", label: "تنورات للنساء", image: "https://images.unsplash.com/photo-1582414262945-8c4d0439378a?q=80&w=640&auto=format&fit=crop" },
      { slug: "women-blazers", label: "بليزرات نسائية", image: "https://images.unsplash.com/photo-1582142391830-a4d1a491879a?q=80&w=640&auto=format&fit=crop" },
      { slug: "women-tanks-camis", label: "بلوزات بدون أكمام وقمصان بحمالات للنساء", image: "https://images.unsplash.com/photo-1620799140408-edc6d5f9650d?q=80&w=640&auto=format&fit=crop" },
      { slug: "women-skinny-pants", label: "بناطيل بقصة ضيقة للنساء", image: "https://images.unsplash.com/photo-1604176354204-926873782855?q=80&w=640&auto=format&fit=crop" },
      { slug: "women-wedding-party-dresses", label: "فساتين لحفلات الزفاف للنساء", image: "https://images.unsplash.com/photo-1590393748494-096c684f354a?q=80&w=640&auto=format&fit=crop" },
      { slug: "women-jumpsuits", label: "جمبسوت للنساء", image: "https://images.unsplash.com/photo-1600218464338-c411a0192343?q=80&w=640&auto=format&fit=crop" },
      { slug: "women-sport-jackets", label: "سترات رياضية", image: "https://images.unsplash.com/photo-1556306535-0f694a20e24b?q=80&w=640&auto=format&fit=crop" },
      { slug: "women-maternity", label: "ملابس الأمومة", image: "https://images.unsplash.com/photo-1559938999-a8d2c180a50d?q=80&w=640&auto=format&fit=crop" },
      { slug: "women-work-safety", label: "ملابس العمل والسلامة للنساء", image: "https://images.unsplash.com/photo-1581091215367-59ab6c99bc62?q=80&w=640&auto=format&fit=crop" },
      { slug: "women-lingerie", label: "ملابس داخلية للنساء", image: "https://images.unsplash.com/photo-1585144723202-13838a1a4884?q=80&w=640&auto=format&fit=crop" },
      { slug: "women-traditional-cultural", label: "ملابس تقليدية وذات طابع ثقافي للنساء", image: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=640&auto=format&fit=crop" },
      { slug: "women-shorts", label: "سراويل قصيرة للنساء", image: "https://images.unsplash.com/photo-1594618332904-92f63bab08f7?q=80&w=640&auto=format&fit=crop" },
      { slug: "women-jeans-styles", label: "أنماط الجينز للنساء", image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=640&auto=format&fit=crop" },
      { slug: "women-denim-jackets", label: "جاكيتات ومعاطف جينز نسائية", image: "https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=640&auto=format&fit=crop" },
      { slug: "women-denim-skirts", label: "تنانير جينز نسائية", image: "https://images.unsplash.com/photo-1582414262945-8c4d0439378a?q=80&w=640&auto=format&fit=crop" },
      { slug: "women-costumes", label: "أزياء تنكرية نسائية", image: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=640&auto=format&fit=crop" },
      { slug: "women-denim-shoes", label: "أحذية جينز للنساء", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "men",
    label: "الملابس الرجالية",
    image: "https://images.unsplash.com/photo-1610384104075-e04c883de4e2?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "men-tops", label: "تيشرتات وقمصان", image: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?q=80&w=640&auto=format&fit=crop" },
      { slug: "men-bottoms", label: "جينز وبناطيل", image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=640&auto=format&fit=crop" },
      { slug: "men-outerwear", label: "جاكيتات ومعاطف", image: "https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?q=80&w=640&auto=format&fit=crop" },
      { slug: "men-active", label: "ملابس رياضية", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=640&auto=format&fit=crop" },
      { slug: "men-hoodies-knit", label: "هوديز وكنزات", image: "https://images.unsplash.com/photo-1611312449412-6cefac5dc3e4?q=80&w=640&auto=format&fit=crop" },
      { slug: "men-underwear-sleep", label: "ملابس داخلية وبيجامات", image: "https://images.unsplash.com/photo-1585733478923-86b54a282a54?q=80&w=640&auto=format&fit=crop" },
      { slug: "men-coords", label: "مجموعات/أطقم", image: "https://images.unsplash.com/photo-1515515932832-86f1e2331f80?q=80&w=640&auto=format&fit=crop" },
      { slug: "men-accessories", label: "إكسسوارات (أحزمة/قبعات/محافظ)", image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=640&auto=format&fit=crop" },
      // Specific bottoms & footwear (Men)
      { slug: "men-jeans", label: "جينز رجالي", image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=640&auto=format&fit=crop" },
      { slug: "men-shoes-sneakers", label: "أحذية رياضية رجالي", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=640&auto=format&fit=crop" },
      { slug: "men-shoes-boots", label: "بوتس رجالي", image: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=640&auto=format&fit=crop" },
      { slug: "men-shoes-formal", label: "أحذية رسمية رجالي", image: "https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?q=80&w=640&auto=format&fit=crop" },
      // Tops specifics
      { slug: "men-shirts", label: "قمصان رجالية", image: "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?q=80&w=640&auto=format&fit=crop" },
      { slug: "men-tshirts", label: "تيشيرتات رجالية", image: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "plus-size",
    label: "مقاسات كبيرة",
    image: "https://images.unsplash.com/photo-1545291730-faff8ca1d4b0?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "plus-dresses", label: "فساتين", image: "https://images.unsplash.com/photo-1545291730-faff8ca1d4b0?q=80&w=640&auto=format&fit=crop" },
      { slug: "plus-tops", label: "بلوزات وتوبات", image: "https://images.unsplash.com/photo-1617137968429-90d5d3b61463?q=80&w=640&auto=format&fit=crop" },
      { slug: "plus-bottoms", label: "جينز وبناطيل", image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=640&auto=format&fit=crop" },
      { slug: "plus-lingerie", label: "ملابس داخلية (شوز/مشدات)", image: "https://images.unsplash.com/photo-1585144723202-13838a1a4884?q=80&w=640&auto=format&fit=crop" },
      { slug: "plus-sleepwear", label: "ملابس نوم وبيجامات", image: "https://images.unsplash.com/photo-1617025121133-5c6c9a419a4e?q=80&w=640&auto=format&fit=crop" },
      { slug: "plus-shoes", label: "أحذية ومقتنيات ملائمة", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "kids",
    label: "الأطفال",
    image: "https://images.unsplash.com/photo-1519648023493-d82b5f8d768a?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "kids-girls", label: "بنات", image: "https://images.unsplash.com/photo-1509315811345-672d83ef2fbc?q=80&w=640&auto=format&fit=crop" },
      { slug: "kids-boys", label: "أولاد", image: "https://images.unsplash.com/photo-1605292356183-a77d0a9c9d1d?q=80&w=640&auto=format&fit=crop" },
      { slug: "kids-baby", label: "رضّع", image: "https://images.unsplash.com/photo-1525999147711-835474620964?q=80&w=640&auto=format&fit=crop" },
      { slug: "kids-toys", label: "ألعاب", image: "https://images.unsplash.com/photo-1550171509-552147343552?q=80&w=640&auto=format&fit=crop" },
      { slug: "kids-party", label: "ملابس حفلات", image: "https://images.unsplash.com/photo-1515488041-412559573a43?q=80&w=640&auto=format&fit=crop" },
      { slug: "kids-school", label: "ملابس مدرسية", image: "https://images.unsplash.com/photo-1580582932707-520aed93a94d?q=80&w=640&auto=format&fit=crop" },
      { slug: "kids-0-24m", label: "0-24 شهر", image: "https://images.unsplash.com/photo-1604467795338-02d02ab2525b?q=80&w=640&auto=format&fit=crop" },
      { slug: "kids-2-6", label: "2-6 سنوات", image: "https://images.unsplash.com/photo-1566004100631-35d015d6a491?q=80&w=640&auto=format&fit=crop" },
      { slug: "kids-7-14", label: "7-14 سنة", image: "https://images.unsplash.com/photo-1513883737812-383214533864?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "underwear-sleepwear",
    label: "ملابس داخلية، وملابس نوم",
    image: "https://images.unsplash.com/photo-1585144723202-13838a1a4884?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "bras", label: "صدريات", image: "https://images.unsplash.com/photo-1585144723202-13838a1a4884?q=80&w=640&auto=format&fit=crop" },
      { slug: "panties", label: "سراويل داخلية", image: "https://images.unsplash.com/photo-1617137968429-90d5d3b61463?q=80&w=640&auto=format&fit=crop" },
      { slug: "sleepwear", label: "ملابس نوم", image: "https://images.unsplash.com/photo-1617025121133-5c6c9a419a4e?q=80&w=640&auto=format&fit=crop" },
      { slug: "thermal", label: "سترات داخلية حرارية", image: "https://images.unsplash.com/photo-1611312449412-6cefac5dc3e4?q=80&w=640&auto=format&fit=crop" },
      { slug: "loungewear", label: "ملابس منزلية (Loungewear)", image: "https://images.unsplash.com/photo-1556306535-0f694a20e24b?q=80&w=640&auto=format&fit=crop" },
      { slug: "socks", label: "جوارب", image: "https://images.unsplash.com/photo-1604176354204-926873782855?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "jewelry-accessories",
    label: "مجوهرات واكسسوارات",
    image: "https://images.unsplash.com/photo-1611652022419-a941954b6868?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "rings", label: "خواتم", image: "https://images.unsplash.com/photo-1601121141499-17ae80afc03a?q=80&w=640&auto=format&fit=crop" },
      { slug: "necklaces", label: "عقود", image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=640&auto=format&fit=crop" },
      { slug: "bracelets", label: "أساور", image: "https://images.unsplash.com/photo-1616964893394-331615258341?q=80&w=640&auto=format&fit=crop" },
      { slug: "earrings", label: "أقراط", image: "https://images.unsplash.com/photo-1610171338232-599c5839b036?q=80&w=640&auto=format&fit=crop" },
      { slug: "hair-accessories", label: "إكسسوارات شعر", image: "https://images.unsplash.com/photo-1599386380327-de0e532a2239?q=80&w=640&auto=format&fit=crop" },
      { slug: "sunglasses", label: "نظارات شمسية", image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=640&auto=format&fit=crop" },
      { slug: "watches", label: "ساعات يد", image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=640&auto=format&fit=crop" },
      { slug: "scarves-gloves", label: "أوشحة وقفازات", image: "https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "bags-luggage",
    label: "الحقائب والأمتعة",
    image: "https://images.unsplash.com/photo-1553062407-98eeb6e0e946?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "handbags", label: "حقائب يد", image: "https://images.unsplash.com/photo-1566150905458-1bf1b296f794?q=80&w=640&auto=format&fit=crop" },
      { slug: "backpacks", label: "شنط ظهر", image: "https://images.unsplash.com/photo-1553062407-98eeb6e0e946?q=80&w=640&auto=format&fit=crop" },
      { slug: "travel-bags", label: "حقائب سفر", image: "https://images.unsplash.com/photo-1587293852726-70cdb16d2866?q=80&w=640&auto=format&fit=crop" },
      { slug: "crossbody", label: "كتف/كروس بودي", image: "https://images.unsplash.com/photo-1600852834497-a72b2a8064e2?q=80&w=640&auto=format&fit=crop" },
      { slug: "wallets", label: "محافظ", image: "https://images.unsplash.com/photo-1619118399232-c5b9a42a04b1?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "shoes",
    label: "أحذية",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "sneakers", label: "أحذية رياضية", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=640&auto=format&fit=crop" },
      { slug: "heels", label: "كعب عالي", image: "https://images.unsplash.com/photo-1590099033615-75185a024716?q=80&w=640&auto=format&fit=crop" },
      { slug: "boots", label: "بوتس", image: "https://images.unsplash.com/photo-1608256246200-53e635701d8b?q=80&w=640&auto=format&fit=crop" },
      { slug: "sandals", label: "صنادل/شباشب", image: "https://images.unsplash.com/photo-1603487742131-412903b6e12b?q=80&w=640&auto=format&fit=crop" },
      { slug: "flats", label: "أحذية مسطحة", image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?q=80&w=640&auto=format&fit=crop" },
      { slug: "formal", label: "أحذية رسمية", image: "https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?q=80&w=640&auto=format&fit=crop" },
      { slug: "kids-shoes", label: "أحذية الأطفال", image: "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "sports-outdoor",
    label: "الرياضة والأنشطة الخارجية",
    image: "https://images.unsplash.com/photo-1471295253337-3ceaa6ca662b?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "fitness", label: "معدات لياقة", image: "https://images.unsplash.com/photo-1599058917212-d750089bc07e?q=80&w=640&auto=format&fit=crop" },
      { slug: "outdoor", label: "رحلات خارجية", image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?q=80&w=640&auto=format&fit=crop" },
      { slug: "sports-shoes", label: "أحذية رياضية متخصصة", image: "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?q=80&w=640&auto=format&fit=crop" },
      { slug: "camping", label: "خيام صغيرة وأدوات", image: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "health-beauty",
    label: "الصحة و الجمال",
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "makeup", label: "مكياج", image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=640&auto=format&fit=crop" },
      { slug: "skincare", label: "العناية بالبشرة", image: "https://images.unsplash.com/photo-1556228852-6d45a7ae2ab5?q=80&w=640&auto=format&fit=crop" },
      { slug: "haircare", label: "العناية بالشعر", image: "https://images.unsplash.com/photo-1560961913-5249d2c20489?q=80&w=640&auto=format&fit=crop" },
      { slug: "fragrance", label: "عطور", image: "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=640&auto=format&fit=crop" },
      { slug: "beauty-tools", label: "أدوات التجميل", image: "https://images.unsplash.com/photo-1552693673-1bf958298935?q=80&w=640&auto=format&fit=crop" },
      { slug: "body-care", label: "مستلزمات الجسم", image: "https://images.unsplash.com/photo-1620916566398-39f168a7676b?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "home-kitchen",
    label: "المنزل والمطبخ",
    image: "https://images.unsplash.com/photo-1556911220-bff31c812dba?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "kitchen-tools", label: "أدوات المطبخ", image: "https://images.unsplash.com/photo-1516655855035-d5215bcb5604?q=80&w=640&auto=format&fit=crop" },
      { slug: "storage", label: "تخزين وتنظيم", image: "https://images.unsplash.com/photo-1601762634464-56e411a0a5a1?q=80&w=640&auto=format&fit=crop" },
      { slug: "home-decor", label: "ديكور منزلي", image: "https://images.unsplash.com/photo-1534349762237-7a2c36a46251?q=80&w=640&auto=format&fit=crop" },
      { slug: "tableware", label: "مستلزمات السفرة والأواني", image: "https://images.unsplash.com/photo-1550623623-a8a5598d2c10?q=80&w=640&auto=format&fit=crop" },
      { slug: "coffee-tea", label: "أدوات القهوة والشاي", image: "https://images.unsplash.com/photo-1511920183353-3c7c95a5742a?q=80&w=640&auto=format&fit=crop" },
      { slug: "lighting", label: "إضاءات ومصابيح زينة", image: "https://images.unsplash.com/photo-1614921258643-41857833c3c7?q=80&w=640&auto=format&fit=crop" },
      { slug: "cleaning-bath", label: "منتجات التنظيف والحمام", image: "https://images.unsplash.com/photo-1582899498309-983331505299?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "home-textiles",
    label: "منسوجات منزلية",
    image: "https://images.unsplash.com/photo-1582582494705-5ea229b84c63?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "bedding", label: "مفارش سرير", image: "https://images.unsplash.com/photo-1582582494705-5ea229b84c63?q=80&w=640&auto=format&fit=crop" },
      { slug: "duvets", label: "أغطية لحاف", image: "https://images.unsplash.com/photo-1616627561839-074385245ff6?q=80&w=640&auto=format&fit=crop" },
      { slug: "pillows", label: "أغطية وسائد", image: "https://images.unsplash.com/photo-1617325247927-724c4731693f?q=80&w=640&auto=format&fit=crop" },
      { slug: "curtains", label: "ستائر", image: "https://images.unsplash.com/photo-1533953932845-339c4a3a8b13?q=80&w=640&auto=format&fit=crop" },
      { slug: "towels", label: "مناشف", image: "https://images.unsplash.com/photo-1616627561839-074385245ff6?q=80&w=640&auto=format&fit=crop" },
      { slug: "sofa-covers", label: "أغطية أريكة", image: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "appliances",
    label: "أجهزة",
    image: "https://images.unsplash.com/photo-1626806819282-2c1dc01a5e0c?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "toasters", label: "محمصات", image: "https://images.unsplash.com/photo-1542689563-431523e38831?q=80&w=640&auto=format&fit=crop" },
      { slug: "mixers", label: "خلاطات", image: "https://images.unsplash.com/photo-1578643463396-997d514b151a?q=80&w=640&auto=format&fit=crop" },
      { slug: "coffee", label: "قهوة وشاي", image: "https://images.unsplash.com/photo-1565452344018-a52d2f01a39c?q=80&w=640&auto=format&fit=crop" },
      { slug: "scales", label: "موازين مطبخ", image: "https://images.unsplash.com/photo-1596704017254-97c1105022a4?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "electronics",
    label: "إلكترونيات",
    image: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "headphones", label: "سماعات", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=640&auto=format&fit=crop" },
      { slug: "smartwatches", label: "ساعات ذكية", image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=640&auto=format&fit=crop" },
      { slug: "small-home-elec", label: "أجهزة منزلية إلكترونية صغيرة", image: "https://images.unsplash.com/photo-1626806819282-2c1dc01a5e0c?q=80&w=640&auto=format&fit=crop" },
      { slug: "flashlights", label: "كشافات", image: "https://images.unsplash.com/photo-1528421469611-82f15a2b0605?q=80&w=640&auto=format&fit=crop" },
      { slug: "speakers", label: "منتجات صوتية", image: "https://images.unsplash.com/photo-1593903173353-61e2a39a2b4b?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "mobile-accessories",
    label: "هواتف خليوية & إكسسوارات",
    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "cases", label: "أغطية", image: "https://images.unsplash.com/photo-1567581935887-2895371c3658?q=80&w=640&auto=format&fit=crop" },
      { slug: "chargers", label: "شواحن", image: "https://images.unsplash.com/photo-1583863752326-240f8d78f8f1?q=80&w=640&auto=format&fit=crop" },
      { slug: "cables", label: "كابلات", image: "https://images.unsplash.com/photo-1525994886778-38d72957585b?q=80&w=640&auto=format&fit=crop" },
      { slug: "screen-protectors", label: "واقي شاشة", image: "https://images.unsplash.com/photo-1598940833639-158e3843212c?q=80&w=640&auto=format&fit=crop" },
      { slug: "mounts", label: "حامل هاتف", image: "https://images.unsplash.com/photo-1551721434-f2dbe6f7eba2?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "toys",
    label: "الألعاب",
    image: "https://images.unsplash.com/photo-1550171509-552147343552?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "educational", label: "ألعاب تعليمية", image: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=640&auto=format&fit=crop" },
      { slug: "building", label: "تركيب", image: "https://images.unsplash.com/photo-1591543620782-17d7a2753624?q=80&w=640&auto=format&fit=crop" },
      { slug: "dolls", label: "دمى", image: "https://images.unsplash.com/photo-1515488041-412559573a43?q=80&w=640&auto=format&fit=crop" },
      { slug: "outdoor-toys", label: "ألعاب خارجية", image: "https://images.unsplash.com/photo-1612033419028-1c1b0a9a4f8c?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "office-school",
    label: "مستلزمات مكتبية ومدرسية",
    image: "https://images.unsplash.com/photo-1456735180827-f004d2b2a04b?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "notebooks", label: "دفاتر", image: "https://images.unsplash.com/photo-1533641002511-3b5b337851b2?q=80&w=640&auto=format&fit=crop" },
      { slug: "pens", label: "أقلام", image: "https://images.unsplash.com/photo-1585336261022-680e295ce3fe?q=80&w=640&auto=format&fit=crop" },
      { slug: "arts", label: "أدوات فنية", image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=640&auto=format&fit=crop" },
      { slug: "organizers", label: "منظّم مكتب", image: "https://images.unsplash.com/photo-1542810634-71277d9528d4?q=80&w=640&auto=format&fit=crop" },
      { slug: "back-to-school", label: "لوازم العودة للمدرسة", image: "https://images.unsplash.com/photo-1566378246598-5211a0ad756c?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "tools-home-improvement",
    label: "أدوات وتحسين المنزل",
    image: "https://images.unsplash.com/photo-1600256059584-91866a87a094?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "hand-tools", label: "أدوات يدوية", image: "https://images.unsplash.com/photo-1508873660763-1c2153ecf215?q=80&w=640&auto=format&fit=crop" },
      { slug: "maintenance", label: "لوازم الصيانة", image: "https://images.unsplash.com/photo-1444723121867-7a241cacace9?q=80&w=640&auto=format&fit=crop" },
      { slug: "power-tools", label: "أدوات كهربائية", image: "https://images.unsplash.com/photo-1581152224908-a0006734a66a?q=80&w=640&auto=format&fit=crop" },
      { slug: "wall-stickers", label: "ملصقات جدارية", image: "https://images.unsplash.com/photo-1560520450-4d295c535a3b?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "automotive",
    label: "السيارات",
    image: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "car-accessories", label: "إكسسوارات", image: "https://images.unsplash.com/photo-1579751626657-72bc17114948?q=80&w=640&auto=format&fit=crop" },
      { slug: "organizers", label: "منظمات داخل السيارة", image: "https://images.unsplash.com/photo-1563720223523-49ae84d057de?q=80&w=640&auto=format&fit=crop" },
      { slug: "seat-covers", label: "أغطية مقاعد", image: "https://images.unsplash.com/photo-1616422285421-f3575e3a1135?q=80&w=640&auto=format&fit=crop" },
      { slug: "floor-mats", label: "فرش أرضيات", image: "https://images.unsplash.com/photo-1612198743124-58104e17432b?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "pet-supplies",
    label: "مستلزمات الحيوانات الأليفة",
    image: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "bowls", label: "أطباق طعام", image: "https://images.unsplash.com/photo-1589924799762-9a73a7e3b2e3?q=80&w=640&auto=format&fit=crop" },
      { slug: "toys", label: "ألعاب", image: "https://images.unsplash.com/photo-1534214526114-0ea4d47b04f2?q=80&w=640&auto=format&fit=crop" },
      { slug: "beds", label: "فرش وسجاد", image: "https://images.unsplash.com/photo-1580794157146-6d9d0833a6a4?q=80&w=640&auto=format&fit=crop" },
      { slug: "collars", label: "أطواق", image: "https://images.unsplash.com/photo-1576683539219-383ff02c9a9f?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  {
    slug: "baby-maternity",
    label: "الأطفال والأمومة",
    image: "https://images.unsplash.com/photo-1546015720-6939e13843b2?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "baby-clothes", label: "ملابس الرضع", image: "https://images.unsplash.com/photo-1525999147711-835474620964?q=80&w=640&auto=format&fit=crop" },
      { slug: "nursing", label: "مستلزمات الرضاعة", image: "https://images.unsplash.com/photo-1610480943938-350a4f5f1442?q=80&w=640&auto=format&fit=crop" },
      { slug: "strollers", label: "عربات أطفال", image: "https://images.unsplash.com/photo-1586796590409-5c8a49375e53?q=80&w=640&auto=format&fit=crop" },
      { slug: "pregnancy", label: "ملابس حمل ورضاعة", image: "https://images.unsplash.com/photo-1559938999-a8d2c180a50d?q=80&w=640&auto=format&fit=crop" },
      { slug: "diapers", label: "حفاضات قماشية", image: "https://images.unsplash.com/photo-1621245233938-b42933b66871?q=80&w=640&auto=format&fit=crop" },
      { slug: "feeding-travel", label: "تغذية ورحلات", image: "https://images.unsplash.com/photo-1502084224-85b73c1a32a1?q=80&w=640&auto=format&fit=crop" },
    ],
  },

  // Special / Trend / Collections
  {
    slug: "special-collections",
    label: "مجموعات خاصة / موضات",
    image: "https://images.unsplash.com/photo-1570823635306-2a54224d3521?q=80&w=640&auto=format&fit=crop",
    children: [
      { slug: "ramadan", label: "مجموعة رمضان", image: "https://images.unsplash.com/photo-1617137968429-90d5d3b61463?q=80&w=640&auto=format&fit=crop" },
      { slug: "eid", label: "مجموعة العيد", image: "https://images.unsplash.com/photo-1590393748494-096c684f354a?q=80&w=640&auto=format&fit=crop" },
      { slug: "summer", label: "مجموعة الصيف", image: "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?q=80&w=640&auto=format&fit=crop" },
      { slug: "new-in", label: "New In / جديد", image: "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=640&auto=format&fit=crop" },
      { slug: "flash-sale", label: "عروض فلاش", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=640&auto=format&fit=crop" },
      { slug: "clearance", label: "تخفيضات/تصفية", image: "https://images.unsplash.com/photo-1508873660763-1c2153ecf215?q=80&w=640&auto=format&fit=crop" },
    ],
  },
  { slug: "sale", label: "تخفيض الأسعار", image: "https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=640&auto=format&fit=crop" },
  { slug: "new-in", label: "جديد في", image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=640&auto=format&fit=crop" },
  { slug: "general", label: "عام", image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=640&auto=format&fit=crop" },
];
