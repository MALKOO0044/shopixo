export interface CustomSubcategory {
  name: string;
  slug: string;
  image: string;
}

export interface CustomCategoryConfig {
  parentSlug: string;
  parentName: string;
  subcategories: CustomSubcategory[];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const CUSTOM_CATEGORIES: Record<string, CustomCategoryConfig> = {
  "womens-clothing": {
    parentSlug: "womens-clothing",
    parentName: "Women's Clothing",
    subcategories: [
      {
        name: "Blazers",
        slug: "blazers",
        image: "https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Jackets",
        slug: "jackets",
        image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Woman Trench",
        slug: "woman-trench",
        image: "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Women's Camis",
        slug: "womens-camis",
        image: "https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Women's Vests",
        slug: "womens-vests",
        image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Women Hoodies & Sweatshirt",
        slug: "women-hoodies-sweatshirt",
        image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Jumpsuits",
        slug: "jumpsuits",
        image: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Sweaters",
        slug: "sweaters",
        image: "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Scarves & Wraps",
        slug: "scarves-wraps",
        image: "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Evening Dresses",
        slug: "evening-dresses",
        image: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Woman Hats & Caps",
        slug: "woman-hats-caps",
        image: "https://images.unsplash.com/photo-1521369909029-2afed882baee?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Woman Jeans",
        slug: "woman-jeans",
        image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Woman Shorts",
        slug: "woman-shorts",
        image: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Wide Leg Pants",
        slug: "wide-leg-pants",
        image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&h=800&fit=crop&crop=center&q=90"
      }
    ]
  },
  "pet-supplies": {
    parentSlug: "pet-supplies",
    parentName: "Pet Supplies",
    subcategories: [
      {
        name: "Pet Headwear",
        slug: "pet-headwear",
        image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Pet Hair Accessories",
        slug: "pet-hair-accessories",
        image: "https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Pet Guardrails",
        slug: "pet-guardrails",
        image: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Pet Glasses",
        slug: "pet-glasses",
        image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Pet Collars",
        slug: "pet-collars",
        image: "https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Bird Accessories",
        slug: "bird-accessories",
        image: "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Pet Shower Products",
        slug: "pet-shower-products",
        image: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Pet Towels",
        slug: "pet-towels",
        image: "https://images.unsplash.com/photo-1587015990127-424b954b2951?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Pet Furniture Tools",
        slug: "pet-furniture-tools",
        image: "https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Fish Tanks",
        slug: "fish-tanks",
        image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Pet Apparels",
        slug: "pet-apparels",
        image: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&h=800&fit=crop&crop=center&q=90"
      }
    ]
  },
  "home-garden-furniture": {
    parentSlug: "home-garden-furniture",
    parentName: "Home, Garden & Furniture",
    subcategories: [
      {
        name: "Kitchen Storage",
        slug: "kitchen-storage",
        image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Furniture",
        slug: "furniture",
        image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Christmas Decoration Suppli",
        slug: "christmas-decoration-suppli",
        image: "https://images.unsplash.com/photo-1512389142860-9c449e58a814?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Curtains",
        slug: "curtains",
        image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Invitation Cards",
        slug: "invitation-cards",
        image: "https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Decorative Flowers & Wreath",
        slug: "decorative-flowers-wreath",
        image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Decor Paintings",
        slug: "decor-paintings",
        image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Ribbons",
        slug: "ribbons",
        image: "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Diamond Painting Cross Stitch",
        slug: "diamond-painting-cross-stitch",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Fabric",
        slug: "fabric",
        image: "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=800&h=800&fit=crop&crop=center&q=90"
      }
    ]
  },
  "health-beauty-hair": {
    parentSlug: "health-beauty-hair",
    parentName: "Health, Beauty & Hair",
    subcategories: [
      {
        name: "Makeup Set",
        slug: "makeup-set",
        image: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Eyeshadow",
        slug: "eyeshadow",
        image: "https://images.unsplash.com/photo-1583241800698-e8ab01828b7a?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "False Eyelashes",
        slug: "false-eyelashes",
        image: "https://images.unsplash.com/photo-1597225244660-1cd128c64284?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Electric Face Cleanser",
        slug: "electric-face-cleanser",
        image: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Face Skin Care Tools",
        slug: "face-skin-care-tools",
        image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Health Care Products",
        slug: "health-care-products",
        image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Human Hair Wigs",
        slug: "human-hair-wigs",
        image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Synthetic Wigs",
        slug: "synthetic-wigs",
        image: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Nail Gel",
        slug: "nail-gel",
        image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Nail dryers",
        slug: "nail-dryers",
        image: "https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Nail Art Kits",
        slug: "nail-art-kits",
        image: "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Pre-Colored Hair Weave",
        slug: "pre-colored-hair-weave",
        image: "https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Essential Oil",
        slug: "essential-oil",
        image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Body Care",
        slug: "body-care",
        image: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Facial care",
        slug: "facial-care",
        image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&h=800&fit=crop&crop=center&q=90"
      }
    ]
  },
  "jewelry-watches": {
    parentSlug: "jewelry-watches",
    parentName: "Jewelry & Watches",
    subcategories: [
      {
        name: "Women Sports Watches",
        slug: "women-sports-watches",
        image: "https://images.unsplash.com/photo-1434056886845-dbd39c1cc727?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Women's Dress Watches",
        slug: "womens-dress-watches",
        image: "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Women's Creative Watches",
        slug: "womens-creative-watches",
        image: "https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Women's Bracelet Watches",
        slug: "womens-bracelet-watches",
        image: "https://images.unsplash.com/photo-1548169874-53e85f753f1e?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Children's Watches",
        slug: "childrens-watches",
        image: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Quartz Watches",
        slug: "quartz-watches",
        image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Mechanical Watches",
        slug: "mechanical-watches",
        image: "https://images.unsplash.com/photo-1539874754764-5a96559165b0?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Digital Watches",
        slug: "digital-watches",
        image: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Men Sports Watches",
        slug: "men-sports-watches",
        image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Various Gemstones",
        slug: "various-gemstones",
        image: "https://images.unsplash.com/photo-1551751299-1b51cab2694c?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "925 Silver Jewelry",
        slug: "925-silver-jewelry",
        image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Pearls Jewelry",
        slug: "pearls-jewelry",
        image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Fine Earrings",
        slug: "fine-earrings",
        image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Men's Fine Jewelry",
        slug: "mens-fine-jewelry",
        image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Fine Jewelry Sets",
        slug: "fine-jewelry-sets",
        image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Rings",
        slug: "rings",
        image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&h=800&fit=crop&crop=center&q=90"
      }
    ]
  },
  "mens-clothing": {
    parentSlug: "mens-clothing",
    parentName: "Men's Clothing",
    subcategories: [
      {
        name: "Men's Ties",
        slug: "mens-ties",
        image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Scarves",
        slug: "scarves",
        image: "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Suits & Blazer",
        slug: "suits-blazer",
        image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Men's Sweaters",
        slug: "mens-sweaters",
        image: "https://images.unsplash.com/photo-1638718687477-4b9e0e0f839f?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Men's Shirts",
        slug: "mens-shirts",
        image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Men's Jackets",
        slug: "mens-jackets",
        image: "https://images.unsplash.com/photo-1544923246-77307dd628b8?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Men's Suits",
        slug: "mens-suits",
        image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Pajama Sets",
        slug: "pajama-sets",
        image: "https://images.unsplash.com/photo-1590330297626-d7aff25a0431?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Man Jeans",
        slug: "man-jeans",
        image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Casual Pants",
        slug: "casual-pants",
        image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Sweatpants",
        slug: "sweatpants",
        image: "https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Men's Long-Sleeved",
        slug: "mens-long-sleeved",
        image: "https://images.unsplash.com/photo-1618886487325-f665032e4f48?w=800&h=800&fit=crop&crop=center&q=90"
      }
    ]
  },
  "bags-shoes": {
    parentSlug: "bags-shoes",
    parentName: "Bags & Shoes",
    subcategories: [
      {
        name: "Woman Boots",
        slug: "woman-boots",
        image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Vulcanize Shoes",
        slug: "vulcanize-shoes",
        image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Pumps",
        slug: "pumps",
        image: "https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Woman Slippers",
        slug: "woman-slippers",
        image: "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Woman Sandals",
        slug: "woman-sandals",
        image: "https://images.unsplash.com/photo-1562273138-f46be4ebdf33?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Flats",
        slug: "flats",
        image: "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Man Boots",
        slug: "man-boots",
        image: "https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Formal Shoes",
        slug: "formal-shoes",
        image: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Man Slippers",
        slug: "man-slippers",
        image: "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Man Sandals",
        slug: "man-sandals",
        image: "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Casual Shoes",
        slug: "casual-shoes",
        image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Men's Luggage & Bags",
        slug: "mens-luggage-bags",
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a44?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Briefcases",
        slug: "briefcases",
        image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Waist Bags",
        slug: "waist-bags",
        image: "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Men's Backpacks",
        slug: "mens-backpacks",
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Luggage & Travel Bags",
        slug: "luggage-travel-bags",
        image: "https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Man Wallets",
        slug: "man-wallets",
        image: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&h=800&fit=crop&crop=center&q=90"
      }
    ]
  },
  "toys-kids-babies": {
    parentSlug: "toys-kids-babies",
    parentName: "Toys, Kids & Babies",
    subcategories: [
      {
        name: "Boys Clothing",
        slug: "boys-clothing",
        image: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Boy Jeans",
        slug: "boy-jeans",
        image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Boy T-Shirts",
        slug: "boy-t-shirts",
        image: "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Boy Hoodies & Sweatshirts",
        slug: "boy-hoodies-sweatshirts",
        image: "https://images.unsplash.com/photo-1445796886651-d31a2c15f3c9?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Outerwear & Coats",
        slug: "outerwear-coats",
        image: "https://images.unsplash.com/photo-1544923246-77307dd628b8?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Boy Accessories",
        slug: "boy-accessories",
        image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Baby Clothes",
        slug: "baby-clothes",
        image: "https://images.unsplash.com/photo-1522771930-78848d9293e8?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Baby Clothes Sets",
        slug: "baby-clothes-sets",
        image: "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Baby Rompers",
        slug: "baby-rompers",
        image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Baby Accessories",
        slug: "baby-accessories",
        image: "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Children's Shoes",
        slug: "childrens-shoes",
        image: "https://images.unsplash.com/photo-1514989940723-e8e51d675571?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Boys Shoes",
        slug: "boys-shoes",
        image: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Baby's First Walkers",
        slug: "babys-first-walkers",
        image: "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "School Bags",
        slug: "school-bags",
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=800&fit=crop&crop=center&q=90"
      }
    ]
  },
  "sports-outdoors": {
    parentSlug: "sports-outdoors",
    parentName: "Sports & Outdoors",
    subcategories: [
      {
        name: "Musical Instruments",
        slug: "musical-instruments",
        image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Hunting",
        slug: "hunting",
        image: "https://images.unsplash.com/photo-1516466723877-e4ec1d736c8a?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Fitness & Bodybuilding",
        slug: "fitness-bodybuilding",
        image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Camping & Hiking",
        slug: "camping-hiking",
        image: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Golf",
        slug: "golf",
        image: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Bicycle Helmets",
        slug: "bicycle-helmets",
        image: "https://images.unsplash.com/photo-1557803175-2f8c4e823a5a?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Bicycle Frames",
        slug: "bicycle-frames",
        image: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Bicycle Lights",
        slug: "bicycle-lights",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Rod Combos",
        slug: "rod-combos",
        image: "https://images.unsplash.com/photo-1532015897157-4bfa67d52c3f?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Fishing Tackle Boxes",
        slug: "fishing-tackle-boxes",
        image: "https://images.unsplash.com/photo-1544552866-d3ed42536cfd?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Two-Piece Suits for swimming",
        slug: "two-piece-suits-swimming",
        image: "https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Sports Accessories",
        slug: "sports-accessories",
        image: "https://images.unsplash.com/photo-1518459031867-a89b944bffe4?w=800&h=800&fit=crop&crop=center&q=90"
      }
    ]
  },
  "consumer-electronics": {
    parentSlug: "consumer-electronics",
    parentName: "Consumer Electronics",
    subcategories: [
      {
        name: "Smart Watches",
        slug: "smart-watches",
        image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Smart Wristbands",
        slug: "smart-wristbands",
        image: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Smart Home Appliances",
        slug: "smart-home-appliances",
        image: "https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Projectors",
        slug: "projectors",
        image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Projectors & Accessories",
        slug: "projectors-accessories",
        image: "https://images.unsplash.com/photo-1626379961798-54f819ee896a?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Home Audio & Video",
        slug: "home-audio-video",
        image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "TV Sticks",
        slug: "tv-sticks",
        image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Earphones & Headphones",
        slug: "earphones-headphones",
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "VR & AR Devices",
        slug: "vr-ar-devices",
        image: "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Action Cameras",
        slug: "action-cameras",
        image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Camcorders",
        slug: "camcorders",
        image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Photo Studio",
        slug: "photo-studio",
        image: "https://images.unsplash.com/photo-1516724562728-afc824a36e84?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Home Electronic Accessory",
        slug: "home-electronic-accessory",
        image: "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Gamepads",
        slug: "gamepads",
        image: "https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=800&h=800&fit=crop&crop=center&q=90"
      }
    ]
  },
  "home-improvement": {
    parentSlug: "home-improvement",
    parentName: "Home Improvement",
    subcategories: [
      {
        name: "Solar Lamps",
        slug: "solar-lamps",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Kitchen Appliances",
        slug: "kitchen-appliances",
        image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Chandeliers",
        slug: "chandeliers",
        image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Night Lights",
        slug: "night-lights",
        image: "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Wall Lamps",
        slug: "wall-lamps",
        image: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Downlights",
        slug: "downlights",
        image: "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "LED Spotlights",
        slug: "led-spotlights",
        image: "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Machine Tools & Accessories",
        slug: "machine-tools-accessories",
        image: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Power Tools",
        slug: "power-tools",
        image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Woodworking Machinery",
        slug: "woodworking-machinery",
        image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Garden Tools",
        slug: "garden-tools",
        image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=800&fit=crop&crop=center&q=90"
      }
    ]
  },
  "automobiles-motorcycles": {
    parentSlug: "automobiles-motorcycles",
    parentName: "Automobiles & Motorcycles",
    subcategories: [
      {
        name: "Lighting",
        slug: "lighting",
        image: "https://images.unsplash.com/photo-1494905998402-395d579af36f?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Exhaust & Exhaust Systems",
        slug: "exhaust-exhaust-systems",
        image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Motor Brake System",
        slug: "motor-brake-system",
        image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Helmet Headset",
        slug: "helmet-headset",
        image: "https://images.unsplash.com/photo-1558981285-6f0c94958bb6?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Body & Frame",
        slug: "body-frame",
        image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Car Monitors",
        slug: "car-monitors",
        image: "https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Vehicle Camera",
        slug: "vehicle-camera",
        image: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Automobiles Seat Covers",
        slug: "automobiles-seat-covers",
        image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Key Case for Car",
        slug: "key-case-car",
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a44?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Automobiles Sensors",
        slug: "automobiles-sensors",
        image: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Exterior Parts",
        slug: "exterior-parts",
        image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Diagnostic Tools",
        slug: "diagnostic-tools",
        image: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Paint Care",
        slug: "paint-care",
        image: "https://images.unsplash.com/photo-1507136566006-cfc505b114fc?w=800&h=800&fit=crop&crop=center&q=90"
      }
    ]
  },
  "phones-accessories": {
    parentSlug: "phones-accessories",
    parentName: "Phones & Accessories",
    subcategories: [
      {
        name: "SIM Card & Tools",
        slug: "sim-card-tools",
        image: "https://images.unsplash.com/photo-1580910051074-3eb694886f7b?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Mobile Batteries",
        slug: "mobile-batteries",
        image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Housings",
        slug: "housings",
        image: "https://images.unsplash.com/photo-1601593346740-925612772716?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "LCDs",
        slug: "lcds",
        image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Power Bank",
        slug: "power-bank",
        image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Screen Protectors",
        slug: "screen-protectors",
        image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Lenses",
        slug: "lenses",
        image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Cases & Covers",
        slug: "cases-covers",
        image: "https://images.unsplash.com/photo-1601593346740-925612772716?w=800&h=800&fit=crop&crop=center&q=90"
      }
    ]
  },
  "computer-office": {
    parentSlug: "computer-office",
    parentName: "Computer & Office",
    subcategories: [
      {
        name: "SSD",
        slug: "ssd",
        image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Office & School Supplies",
        slug: "office-school-supplies",
        image: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Computer Tablet Accessorie",
        slug: "computer-tablet-accessorie",
        image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "3D Pens",
        slug: "3d-pens",
        image: "https://images.unsplash.com/photo-1631556097157-b42a99b6b66e?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Printers",
        slug: "printers",
        image: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "3G Modems",
        slug: "3g-modems",
        image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Network Cards",
        slug: "network-cards",
        image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Tablet Cases",
        slug: "tablet-cases",
        image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Tablet Accessories",
        slug: "tablet-accessories",
        image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Tablet LCD Screens",
        slug: "tablet-lcd-screens",
        image: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Surveillance Products",
        slug: "surveillance-products",
        image: "https://images.unsplash.com/photo-1558002038-1055907df827?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Alarm & Sensor",
        slug: "alarm-sensor",
        image: "https://images.unsplash.com/photo-1558002038-1055907df827?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Tablets",
        slug: "tablets",
        image: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&h=800&fit=crop&crop=center&q=90"
      },
      {
        name: "Gaming Laptops",
        slug: "gaming-laptops",
        image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=800&fit=crop&crop=center&q=90"
      }
    ]
  }
};

export function getCustomSubcategories(parentSlug: string): CustomSubcategory[] | null {
  const config = CUSTOM_CATEGORIES[parentSlug];
  return config ? config.subcategories : null;
}

export function hasCustomSubcategories(parentSlug: string): boolean {
  return parentSlug in CUSTOM_CATEGORIES;
}
