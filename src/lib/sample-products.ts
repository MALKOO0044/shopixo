import type { Product } from "@/lib/types";

// Samples removed permanently. Keep empty export to avoid import errors if referenced.
export const SAMPLE_PRODUCTS: Product[] = [];
/*
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
  },
  // --- Additional curated CN products ---
  {
    id: 2001,
    title: "تيشيرت قطن أساسي رجالي",
    slug: "men-basic-cotton-tee",
    description: "تيشيرت قطن 180 GSM بقصة مريحة ومناسبة للاستخدام اليومي.",
    price: 39,
    images: [
      "https://images.unsplash.com/photo-1544716278-e513176f20b5?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "ملابس رجالية",
    rating: 4.5,
    stock: 120,
    variants: [
      { name: "المقاس", options: ["S","M","L","XL","2XL"] },
      { name: "اللون", options: ["أسود","أبيض","كحلي"] }
    ],
    is_active: true,
  },
  {
    id: 2002,
    title: "هودي رجالي سادة",
    slug: "men-plain-hoodie",
    description: "هودي قطني متوسط السماكة ببطانة ناعمة.",
    price: 99,
    images: [
      "https://images.unsplash.com/photo-1618333272197-2ee791c42963?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "ملابس رجالية",
    rating: 4.4,
    stock: 80,
    variants: [
      { name: "المقاس", options: ["S","M","L","XL"] },
      { name: "اللون", options: ["أسود","رمادي","زيتي"] }
    ],
    is_active: true,
  },
  {
    id: 2003,
    title: "جينز ممزق للنساء",
    slug: "women-ripped-jeans",
    description: "جينز نسائي بقصة ضيقة وتمزقات خفيفة لمظهر عصري.",
    price: 99,
    images: [
      "https://images.unsplash.com/photo-1632852301634-96b856283a5e?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "ملابس نسائية",
    rating: 4.6,
    stock: 90,
    variants: [
      { name: "المقاس", options: ["26","28","30","32","34"] },
      { name: "اللون", options: ["أزرق","أسود"] }
    ],
    is_active: true,
  },
  {
    id: 2004,
    title: "بلوزة شيفون نسائية",
    slug: "women-chiffon-blouse",
    description: "بلوزة خفيفة من الشيفون مناسبة للعمل والخروج.",
    price: 79,
    images: [
      "https://images.unsplash.com/photo-1613419489076-15da367b38df?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "ملابس نسائية",
    rating: 4.5,
    stock: 110,
    variants: [
      { name: "المقاس", options: ["S","M","L","XL"] },
      { name: "اللون", options: ["أبيض","بيج","أسود"] }
    ],
    is_active: true,
  },
  {
    id: 2005,
    title: "سنيكرز رجالي خفيف",
    slug: "men-light-sneaker",
    description: "حذاء رياضي رجالي خفيف ومريح للمشي اليومي.",
    price: 139,
    images: [
      "https://images.unsplash.com/photo-1707125249530-f1e3ee0a1b9c?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "أحذية رجالية",
    rating: 4.6,
    stock: 70,
    variants: [
      { name: "المقاس", options: ["40","41","42","43","44","45"] },
      { name: "اللون", options: ["أبيض","أسود","رمادي"] }
    ],
    is_active: true,
  },
  {
    id: 2006,
    title: "سنيكرز نسائي عصري",
    slug: "women-trendy-sneaker",
    description: "سنيكرز بتصميم عصري ونعل خفيف للراحة اليومية.",
    price: 149,
    images: [
      "https://images.unsplash.com/photo-1695225897718-b657a89ca78f?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "أحذية نسائية",
    rating: 4.7,
    stock: 85,
    variants: [
      { name: "المقاس", options: ["36","37","38","39","40","41"] },
      { name: "اللون", options: ["أبيض","أسود","بيج"] }
    ],
    is_active: true,
  },
  {
    id: 2007,
    title: "فستان يومي بسيط",
    slug: "women-daily-simple-dress",
    description: "فستان كاجوال بقصة مستقيمة ومظهر أنيق.",
    price: 109,
    images: [
      "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "ملابس نسائية",
    rating: 4.4,
    stock: 95,
    variants: [
      { name: "المقاس", options: ["S","M","L","XL"] },
      { name: "اللون", options: ["أسود","أزرق","أخضر"] }
    ],
    is_active: true,
  },
  {
    id: 2008,
    title: "بنطال كارجو رجالي",
    slug: "men-cargo-pants-basic",
    description: "بنطال كارجو متعدد الجيوب بقصة مريحة.",
    price: 99,
    images: [
      "https://images.unsplash.com/photo-1690908719438-330c0045d408?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "ملابس رجالية",
    rating: 4.5,
    stock: 100,
    variants: [
      { name: "المقاس", options: ["S","M","L","XL"] },
      { name: "اللون", options: ["كاكي","أسود","رمادي"] }
    ],
    is_active: true,
  },
  {
    id: 2009,
    title: "طقم أطفال صيفي",
    slug: "kids-summer-set",
    description: "طقم أطفال قطعتين بخامة قطنية ناعمة.",
    price: 55,
    images: [
      "https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "أزياء الأطفال",
    rating: 4.8,
    stock: 140,
    variants: [
      { name: "العمر", options: ["2-3","3-4","4-5","5-6"] },
      { name: "اللون", options: ["بيج","أزرق","زهري"] }
    ],
    is_active: true,
  },
  {
    id: 2010,
    title: "شنطة ظهر نسائية بسيطة",
    slug: "women-simple-backpack",
    description: "شنطة ظهر يومية بتقسيمات عملية وخامة متينة.",
    price: 89,
    images: [
      "https://images.unsplash.com/photo-1689914667397-a77effb740da?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "الحقائب والأمتعة",
    rating: 4.4,
    stock: 120,
    variants: [
      { name: "اللون", options: ["أسود","بيج","بني"] }
    ],
    is_active: true,
  },
  {
    id: 2011,
    title: "سوار نسائي بسيط",
    slug: "women-minimal-bracelet",
    description: "سوار معدن مطلي بتصميم بسيط وأنيق.",
    price: 39,
    images: [
      "https://images.unsplash.com/photo-1670574914335-0bcd4a768d76?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "مجوهرات واكسسوارات",
    rating: 4.3,
    stock: 160,
    variants: [
      { name: "اللون", options: ["ذهبي","فضي"] }
    ],
    is_active: true,
  },
  {
    id: 2012,
    title: "حقيبة يد نسائية",
    slug: "women-handbag-classic",
    description: "حقيبة يد كلاسيكية بمساحة جيدة للاستخدام اليومي.",
    price: 119,
    images: [
      "https://images.unsplash.com/photo-1689914667397-a77effb740da?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "الحقائب والأمتعة",
    rating: 4.5,
    stock: 90,
    variants: [
      { name: "اللون", options: ["أسود","بيج","بني"] }
    ],
    is_active: true,
  },
  {
    id: 2013,
    title: "منظم مطبخ جداري",
    slug: "kitchen-wall-organizer",
    description: "منظم مطبخ لتعليق الأدوات وتوفير المساحة.",
    price: 49,
    images: [
      "https://images.unsplash.com/photo-1616065758546-a50b6d3190b1?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "المنزل والحديقة",
    rating: 4.4,
    stock: 200,
    variants: [
      { name: "اللون", options: ["أسود","رمادي","أبيض"] }
    ],
    is_active: true,
  },
  {
    id: 2014,
    title: "كفر جوال شفاف",
    slug: "clear-phone-case",
    description: "كفر شفاف مضاد للصدمات لهواتف متعددة.",
    price: 29,
    images: [
      "https://images.unsplash.com/photo-1588864669083-2f5960a6f62f?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "هواتف خليوية & إكسسوارات",
    rating: 4.2,
    stock: 300,
    variants: [
      { name: "اللون", options: ["شفاف","أسود"] }
    ],
    is_active: true,
  },
  {
    id: 2015,
    title: "كيبل شحن سريع USB-C",
    slug: "usb-c-fast-cable",
    description: "كيبل USB-C يدعم الشحن السريع بطول 1 متر.",
    price: 25,
    images: [
      "https://images.unsplash.com/photo-1535303311164-664fc9ec6532?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "هواتف خليوية & إكسسوارات",
    rating: 4.4,
    stock: 500,
    variants: [
      { name: "اللون", options: ["أسود","أبيض"] }
    ],
    is_active: true,
  },
  {
    id: 2016,
    title: "شبشب نسائي صيفي",
    slug: "women-summer-slides",
    description: "شبشب خفيف للمنزل والشاطئ.",
    price: 29,
    images: [
      "https://images.unsplash.com/photo-1703622846437-d99b08a906b0?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "أحذية نسائية",
    rating: 4.1,
    stock: 220,
    variants: [
      { name: "المقاس", options: ["36","37","38","39","40"] },
      { name: "اللون", options: ["زهري","بيج","أزرق"] }
    ],
    is_active: true,
  },
  {
    id: 2017,
    title: "صندل رجالي مسطح",
    slug: "men-flat-sandals",
    description: "صندل رجالي مريح بنعل مطاطي.",
    price: 49,
    images: [
      "https://images.unsplash.com/photo-1662308074084-8e2d73c353e6?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "أحذية رجالية",
    rating: 4.2,
    stock: 150,
    variants: [
      { name: "المقاس", options: ["40","41","42","43","44"] },
      { name: "اللون", options: ["أسود","بني"] }
    ],
    is_active: true,
  },
  {
    id: 2018,
    title: "قميص رجالي قصير",
    slug: "men-short-sleeve-shirt",
    description: "قميص قصير الأكمام بخامة قطنية خفيفة.",
    price: 79,
    images: [
      "https://images.unsplash.com/photo-1592878904946-b3cd69fbcf94?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "ملابس رجالية",
    rating: 4.3,
    stock: 100,
    variants: [
      { name: "المقاس", options: ["S","M","L","XL"] },
      { name: "اللون", options: ["أبيض","أزرق","رمادي"] }
    ],
    is_active: true,
  },
  {
    id: 2019,
    title: "توب نسائي بسيط",
    slug: "women-basic-top",
    description: "توب نسائي بسيط مناسب للتنسيق اليومي.",
    price: 49,
    images: [
      "https://images.unsplash.com/photo-1710954962775-c46bd6a5f67f?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "ملابس نسائية",
    rating: 4.2,
    stock: 180,
    variants: [
      { name: "المقاس", options: ["S","M","L","XL"] },
      { name: "اللون", options: ["أبيض","أسود","زهري"] }
    ],
    is_active: true,
  },
  {
    id: 2020,
    title: "منظم أدراج قماشي",
    slug: "fabric-drawer-organizer",
    description: "منظم قماشي قابل للطي لترتيب الأدراج.",
    price: 35,
    images: [
      "https://images.unsplash.com/photo-1616065758546-a50b6d3190b1?auto=format&fit=crop&w=1200&q=80"
    ],
    category: "المنزل والحديقة",
    rating: 4.4,
    stock: 260,
    variants: [
      { name: "اللون", options: ["رمادي","بيج","أسود"] }
    ],
    is_active: true,
  },
];
*/
