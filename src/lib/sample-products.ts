import type { Product } from "@/lib/types";

export const SAMPLE_PRODUCTS: Product[] = [
  {
    id: 1001,
    title: "تيشيرت قطن أساسي للنساء",
    slug: "women-basic-cotton-tee",
    description: "تيشيرت قطن ناعم 180 GSM بقصة مريحة. مناسب للاستخدام اليومي.",
    price: 39,
    images: [
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1544716278-e513176f20b5?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "ملابس نسائية",
    rating: 4.6,
    stock: 120,
    variants: [
      { name: "المقاس", options: ["S","M","L","XL"] },
      { name: "اللون", options: ["أسود","أبيض","بيج"] }
    ],
    is_active: true,
  },
  {
    id: 1002,
    title: "جينز هاي ويست للنساء",
    slug: "women-high-waist-jeans",
    description: "جينز بقصة مريحة ومرونة خفيفة، مظهر أنيق يومي.",
    price: 79,
    images: [
      "https://images.unsplash.com/photo-1554238113-6d3dbed5cf55?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "ملابس نسائية",
    rating: 4.5,
    stock: 60,
    variants: [
      { name: "المقاس", options: ["26","28","30","32","34"] },
      { name: "اللون", options: ["أزرق","أسود"] }
    ],
    is_active: true,
  },
  {
    id: 1003,
    title: "حذاء رياضي نسائي خفيف",
    slug: "women-light-sneaker",
    description: "حذاء رياضي خفيف الوزن ومريح للمشي اليومي.",
    price: 99,
    images: [
      "https://images.unsplash.com/photo-1695225897718-b657a89ca78f?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "أحذية نسائية",
    rating: 4.7,
    stock: 80,
    variants: [
      { name: "المقاس", options: ["36","37","38","39","40","41"] },
      { name: "اللون", options: ["أبيض","أسود","بيج"] }
    ],
    is_active: true,
  },
  {
    id: 1004,
    title: "قميص رجالي بأكمام طويلة",
    slug: "men-long-sleeve-shirt",
    description: "قميص كلاسيكي بخامة قطنية، مناسب للعمل والخروج.",
    price: 89,
    images: [
      "https://images.unsplash.com/photo-1592878904946-b3cd69fbcf94?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "ملابس رجالية",
    rating: 4.4,
    stock: 70,
    variants: [
      { name: "المقاس", options: ["S","M","L","XL","2XL"] },
      { name: "اللون", options: ["أبيض","أزرق سماوي","رمادي"] }
    ],
    is_active: true,
  },
  {
    id: 1005,
    title: "بنطال رياضي رجالي",
    slug: "men-jogger-pants",
    description: "بنطال جوجر بقصة مريحة ومطاط عند الخصر، للاستخدام اليومي والرياضة.",
    price: 69,
    images: [
      "https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "ملابس رجالية",
    rating: 4.5,
    stock: 90,
    variants: [
      { name: "المقاس", options: ["S","M","L","XL"] },
      { name: "اللون", options: ["أسود","رمادي"] }
    ],
    is_active: true,
  },
  {
    id: 1006,
    title: "فستان صيفي مزهر",
    slug: "women-summer-floral-dress",
    description: "فستان خفيف بنقشة زهور، مثالي للصيف والمشاوير.",
    price: 119,
    images: [
      "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "ملابس نسائية",
    rating: 4.6,
    stock: 50,
    variants: [
      { name: "المقاس", options: ["S","M","L"] },
      { name: "اللون", options: ["زهري","أزرق فاتح"] }
    ],
    is_active: true,
  },
  {
    id: 1007,
    title: "طقم أطفال قطني (قطعتان)",
    slug: "kids-cotton-set-2pcs",
    description: "طقم للأطفال من قطعتين بخامة قطنية مريحة.",
    price: 59,
    images: [
      "https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "أزياء الأطفال",
    rating: 4.8,
    stock: 100,
    variants: [
      { name: "العمر", options: ["2-3","3-4","4-5","5-6"] },
      { name: "اللون", options: ["بيج","أزرق"] }
    ],
    is_active: true,
  },
  {
    id: 1008,
    title: "شبشب منزلي مبطن",
    slug: "women-cozy-home-slippers",
    description: "شبشب منزلي مبطن ومريح للنساء.",
    price: 35,
    images: [
      "https://images.unsplash.com/photo-1703622846437-d99b08a906b0?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "أحذية نسائية",
    rating: 4.3,
    stock: 140,
    variants: [
      { name: "المقاس", options: ["36","37","38","39","40"] },
      { name: "اللون", options: ["زهري","رمادي","بيج"] }
    ],
    is_active: true,
  },
  {
    id: 1009,
    title: "حقيبة كتف عملية",
    slug: "women-shoulder-bag-classic",
    description: "حقيبة كتف كلاسيكية بمساحة جيدة للاستخدام اليومي.",
    price: 89,
    images: [
      "https://images.unsplash.com/photo-1689914667397-a77effb740da?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "حقائب وأحذية",
    rating: 4.5,
    stock: 85,
    variants: [
      { name: "اللون", options: ["أسود","بني","بيج"] }
    ],
    is_active: true,
  },
  {
    id: 1010,
    title: "منظم أدراج للمنزل",
    slug: "home-drawer-organizer",
    description: "منظم أدراج قابل للتخصيص لتخزين الملابس الصغيرة والإكسسوارات.",
    price: 29,
    images: [
      "https://images.unsplash.com/photo-1616065758546-a50b6d3190b1?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "المنزل والحديقة",
    rating: 4.4,
    stock: 200,
    variants: [
      { name: "اللون", options: ["رمادي","بيج"] }
    ],
    is_active: true,
  },
  {
    id: 1011,
    title: "ساعة يد أنيقة للنساء",
    slug: "women-elegant-watch",
    description: "ساعة يد بسيطة وأنيقة بتصميم عصري.",
    price: 149,
    images: [
      "https://images.unsplash.com/photo-1670574914335-0bcd4a768d76?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "المجوهرات والساعات",
    rating: 4.6,
    stock: 40,
    variants: [
      { name: "اللون", options: ["ذهبي","فضي"] }
    ],
    is_active: true,
  },
  {
    id: 1012,
    title: "مزهرية ديكور سيراميك",
    slug: "home-ceramic-vase",
    description: "مزهرية سيراميك بسيطة لإضافة لمسة جمالية في المنزل.",
    price: 45,
    images: [
      "https://images.unsplash.com/photo-1728947850665-32f996262c5a?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "المنزل والحديقة",
    rating: 4.2,
    stock: 110,
    variants: [
      { name: "اللون", options: ["أبيض","أسود"] }
    ],
    is_active: true,
  }
];
