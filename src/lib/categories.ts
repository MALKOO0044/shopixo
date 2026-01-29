export type CategoryDef = { slug: string; label: string };

export const CATEGORIES: CategoryDef[] = [
  { slug: "general", label: "General" },
  { slug: "new-in", label: "New Arrivals" },
  { slug: "sale", label: "Sale" },
  { slug: "womens-clothing", label: "Women's Clothing" },
  { slug: "pet-supplies", label: "Pet Supplies" },
  { slug: "home-garden-furniture", label: "Home, Garden & Furniture" },
  { slug: "health-beauty-hair", label: "Health, Beauty & Hair" },
  { slug: "jewelry-watches", label: "Jewelry & Watches" },
  { slug: "mens-clothing", label: "Men's Clothing" },
  { slug: "bags-shoes", label: "Bags & Shoes" },
  { slug: "toys-kids-babies", label: "Toys, Kids & Babies" },
  { slug: "sports-outdoors", label: "Sports & Outdoors" },
  { slug: "consumer-electronics", label: "Consumer Electronics" },
  { slug: "home-improvement", label: "Home Improvement" },
  { slug: "automobiles-motorcycles", label: "Automobiles & Motorcycles" },
  { slug: "phones-accessories", label: "Phones & Accessories" },
  { slug: "computer-office", label: "Computer & Office" },
];

export function labelFromSlug(slug: string): string | undefined {
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

export type SubcategoryItem = { slug: string; label: string };

export type SubcategoryGroup = {
  groupName: string;
  items: SubcategoryItem[];
};

export type FullCategoryChild = { slug: string; label: string; image?: string };

export type FullCategory = {
  slug: string;
  label: string;
  image?: string;
  children?: FullCategoryChild[];
  groups?: SubcategoryGroup[];
};

export const FULL_CATEGORIES: FullCategory[] = [
  {
    slug: "womens-clothing",
    label: "Women's Clothing",
    image: "https://images.unsplash.com/photo-1572804013427-4d7ca7268211?q=80&w=640&auto=format&fit=crop",
    groups: [
      {
        groupName: "Outerwear & Jackets",
        items: [
          { slug: "blazers", label: "Blazers" },
          { slug: "wool-blend", label: "Wool & Blend" },
          { slug: "women-padded-jackets", label: "Women's Padded Jackets" },
          { slug: "woman-trench", label: "Woman Trench" },
          { slug: "basic-jacket", label: "Basic Jacket" },
          { slug: "leather-suede", label: "Leather & Suede" },
          { slug: "real-fur", label: "Real Fur" },
        ],
      },
      {
        groupName: "Couple&Parent-Child Clothing",
        items: [
          { slug: "couple-parent-child-sweatshirts", label: "Couple&Parent-Child Sweatshirts" },
          { slug: "couple-parent-child-short-sleeves", label: "Couple&Parent-Child Short-Sleeves" },
          { slug: "couple-parent-child-jackets", label: "Couple&Parent-Child Jackets" },
          { slug: "couple-parent-child-tops", label: "Couple&Parent-Child Tops" },
          { slug: "couple-parent-child-suits", label: "Couple&Parent-Child Suits" },
          { slug: "couple-parent-child-pants", label: "Couple&Parent-Child Pants" },
        ],
      },
      {
        groupName: "Accessories",
        items: [
          { slug: "scarves-wraps", label: "Scarves & Wraps" },
          { slug: "face-masks", label: "Face Masks" },
          { slug: "belts-cummerbunds", label: "Belts & Cummerbunds" },
          { slug: "woman-gloves-mittens", label: "Woman Gloves & Mittens" },
          { slug: "woman-socks", label: "Woman Socks" },
          { slug: "woman-hats-caps", label: "Woman Hats & Caps" },
        ],
      },
      {
        groupName: "Bottoms",
        items: [
          { slug: "leggings", label: "Leggings" },
          { slug: "skirts", label: "Skirts" },
          { slug: "woman-jeans", label: "Woman Jeans" },
          { slug: "woman-shorts", label: "Woman Shorts" },
          { slug: "pants-capris", label: "Pants & Capris" },
          { slug: "wide-leg-pants", label: "Wide Leg Pants" },
        ],
      },
      {
        groupName: "Tops & Sets",
        items: [
          { slug: "ladies-short-sleeve", label: "Ladies Short Sleeve" },
          { slug: "women-camis", label: "Women's Camis" },
          { slug: "women-vests", label: "Women's Vests" },
          { slug: "women-short-sleeved-shirts", label: "Women's Short-Sleeved Shirts" },
          { slug: "women-long-sleeved-shirts", label: "Women's Long-Sleeved Shirts" },
          { slug: "blouses-shirts", label: "Blouses & Shirts" },
          { slug: "women-hoodies-sweatshirts", label: "Women Hoodies & Sweatshirts" },
          { slug: "jumpsuits", label: "Jumpsuits" },
          { slug: "rompers", label: "Rompers" },
          { slug: "lady-dresses", label: "Lady Dresses" },
          { slug: "sweaters", label: "Sweaters" },
          { slug: "suits-sets", label: "Suits & Sets" },
        ],
      },
      {
        groupName: "Weddings & Events",
        items: [
          { slug: "cocktail-dresses", label: "Cocktail Dresses" },
          { slug: "evening-dresses", label: "Evening Dresses" },
          { slug: "bridesmaid-dresses", label: "Bridesmaid Dresses" },
          { slug: "prom-dresses", label: "Prom Dresses" },
          { slug: "wedding-dresses", label: "Wedding Dresses" },
          { slug: "flower-girl-dresses", label: "Flower Girl Dresses" },
        ],
      },
    ],
  },
  {
    slug: "pet-supplies",
    label: "Pet Supplies",
    image: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?q=80&w=640&auto=format&fit=crop",
    groups: [
      {
        groupName: "Pet Outdoor Supplies",
        items: [
          { slug: "barking-control-equipment", label: "Barking Control Equipments" },
          { slug: "trainers", label: "Trainers" },
          { slug: "dog-training-pads-diapers", label: "Dog Training Pads & Diapers" },
          { slug: "pet-snacks", label: "Pet Snacks" },
          { slug: "pet-bags", label: "Pet Bags" },
          { slug: "pet-seat-belts", label: "Pet Seat Belts" },
          { slug: "pet-car-mats", label: "Pet Car Mats" },
          { slug: "pet-guardrails", label: "Pet Guardrails" },
        ],
      },
      {
        groupName: "Pet Furnitures",
        items: [
          { slug: "cat-scratching-posts", label: "Cat Scratching Posts" },
          { slug: "pet-furniture-protectors", label: "Pet Furniture Protectors" },
          { slug: "cat-trees-condos", label: "Cat Trees & Condos" },
          { slug: "pet-furniture-tools", label: "Pet Furniture Tools" },
          { slug: "pet-houses-cages", label: "Pet Houses & Cages" },
          { slug: "dog-stairs-steps", label: "Dog Stairs & Steps" },
          { slug: "pet-tents", label: "Pet Tents" },
          { slug: "pet-hammocks", label: "Pet Hammocks" },
        ],
      },
      {
        groupName: "Pet Drinking & Feeding",
        items: [
          { slug: "pet-bowls", label: "Pet Bowls" },
          { slug: "pet-drinking-tools", label: "Pet Drinking Tools" },
          { slug: "pet-feeding-tools", label: "Pet Feeding Tools" },
        ],
      },
      {
        groupName: "Fish & Aquatic Pets",
        items: [
          { slug: "fish-tanks", label: "Fish Tanks" },
          { slug: "fish-tank-decorations", label: "Fish Tank Decorations" },
          { slug: "fish-tank-cleaning-supplies", label: "Fish Tank Cleaning Supplies" },
        ],
      },
      {
        groupName: "Pet Collars, Harnesses & Accessories",
        items: [
          { slug: "pet-hair-accessories", label: "Pet Hair Accessories" },
          { slug: "pet-bows-ties", label: "Pet Bows & Ties" },
          { slug: "pet-necklaces", label: "Necklaces" },
          { slug: "pet-headwear", label: "Pet Headwear" },
          { slug: "pet-glasses", label: "Pet Glasses" },
          { slug: "pet-collars", label: "Pet Collars" },
          { slug: "pet-leashes", label: "Pet Leashes" },
          { slug: "pet-harnesses", label: "Pet Harnesses" },
          { slug: "pet-muzzles", label: "Pet Muzzles" },
          { slug: "pet-collar-leash-harness-sets", label: "Pet Collar, Leash & Harness Sets" },
          { slug: "custom-pet-tags", label: "Custom Pet tags, Collars, Leashes & Harnesses" },
        ],
      },
      {
        groupName: "Pet Toys",
        items: [
          { slug: "pet-chase-toys", label: "Pet Chase Toys" },
          { slug: "pet-chew-toys", label: "Pet Chew Toys" },
          { slug: "pet-training-educational-toys", label: "Pet Training and Educational Toys" },
          { slug: "pet-sound-toys", label: "Pet Sound Toys" },
          { slug: "pet-tunnel-toys", label: "Pet Tunnel Toys" },
          { slug: "pet-toy-set", label: "Pet Toy Set" },
          { slug: "pet-plush-toys", label: "Pet Plush Toys" },
        ],
      },
      {
        groupName: "Pet Bedding",
        items: [
          { slug: "pet-mats", label: "Pet Mats" },
          { slug: "pet-nests", label: "Pet Nests" },
          { slug: "pet-beds", label: "Pet Beds" },
          { slug: "pet-blankets-quilts", label: "Pet Blankets & Quilts" },
        ],
      },
      {
        groupName: "Pet Apparels",
        items: [
          { slug: "pet-dresses", label: "Pet Dresses" },
          { slug: "pet-tops", label: "Pet Tops" },
          { slug: "pet-sweaters", label: "Pet Sweaters" },
          { slug: "pet-sweatshirts-hoodies", label: "Pet Sweatshirts & Hoodies" },
          { slug: "pet-coats-jackets", label: "Pet Coats & Jackets" },
          { slug: "pet-jumpsuits", label: "Pet Jumpsuits" },
          { slug: "pet-pajamas", label: "Pet Pajamas" },
          { slug: "pet-clothing", label: "Pet Clothing" },
          { slug: "pet-clothing-sets", label: "Pet Clothing Sets" },
          { slug: "pet-down-parkas", label: "Pet Down & Parkas" },
          { slug: "pet-shoes-socks", label: "Pet Shoes & Socks" },
          { slug: "pet-scarves", label: "Pet Scarves" },
          { slug: "pet-bags-apparels", label: "Pet Bags" },
        ],
      },
      {
        groupName: "Bird Supplies",
        items: [
          { slug: "bird-feeders", label: "Bird Feeders" },
          { slug: "bird-cages", label: "Bird Cages" },
          { slug: "bird-swings", label: "Bird Swings" },
          { slug: "bird-toys", label: "Bird Toys" },
          { slug: "bird-travel-bags", label: "Bird Travel Bags" },
          { slug: "bird-accessories", label: "Bird Accessories" },
        ],
      },
      {
        groupName: "Pet Groomings",
        items: [
          { slug: "pet-hair-removers-combs", label: "Pet Hair Removers & Combs" },
          { slug: "pet-nail-polishers", label: "Pet Nail Polishers" },
          { slug: "pet-shower-products", label: "Pet Shower Products" },
          { slug: "pet-towels", label: "Pet Towels" },
        ],
      },
    ],
  },
  {
    slug: "home-garden-furniture",
    label: "Home, Garden & Furniture",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=640&auto=format&fit=crop",
    groups: [
      {
        groupName: "Home Textiles",
        items: [
          { slug: "curtains", label: "Curtains" },
          { slug: "cushion-covers", label: "Cushion Covers" },
          { slug: "towels", label: "Towels" },
          { slug: "comforters", label: "Comforters" },
          { slug: "bedding-sets", label: "Bedding Sets" },
          { slug: "pillows", label: "Pillows" },
        ],
      },
      {
        groupName: "Festive & Party Supplies",
        items: [
          { slug: "christmas-decoration-supplies", label: "Christmas Decoration Supplies" },
          { slug: "invitation-cards", label: "Invitation Cards" },
          { slug: "cake-decorating-supplies", label: "Cake Decorating Supplies" },
          { slug: "decorative-flowers-wreaths", label: "Decorative Flowers & Wreaths" },
          { slug: "party-masks", label: "Party Masks" },
          { slug: "event-party-supplies", label: "Event & Party Supplies" },
        ],
      },
      {
        groupName: "Arts, Crafts & Sewing",
        items: [
          { slug: "decor-paintings", label: "Decor Paintings" },
          { slug: "lace", label: "Lace" },
          { slug: "apparel-sewing-fabric", label: "Apparel Sewing & Fabric" },
          { slug: "cross-stitch", label: "Cross-Stitch" },
          { slug: "ribbons", label: "Ribbons" },
          { slug: "diamond-painting-cross-stitch", label: "Diamond Painting Cross Stitch" },
          { slug: "fabric", label: "Fabric" },
        ],
      },
      {
        groupName: "Kitchen, Dining & Bar",
        items: [
          { slug: "dinnerware", label: "Dinnerware" },
          { slug: "kitchen-knives-accessories", label: "Kitchen Knives & Accessories" },
          { slug: "bakeware", label: "Bakeware" },
          { slug: "barware", label: "Barware" },
          { slug: "drinkware", label: "Drinkware" },
          { slug: "cooking-tools", label: "Cooking Tools" },
        ],
      },
      {
        groupName: "Home Storage",
        items: [
          { slug: "stationeries", label: "Stationeries" },
          { slug: "furniture", label: "Furniture" },
          { slug: "storage-bags-cases-boxes", label: "Storage Bags & Cases & Boxes" },
          { slug: "kitchen-storage", label: "Kitchen Storage" },
          { slug: "home-office-storage", label: "Home Office Storage" },
          { slug: "clothing-wardrobe-storage", label: "Clothing & Wardrobe Storage" },
          { slug: "bathroom-storage", label: "Bathroom Storage" },
          { slug: "storage-bottles-jars", label: "Storage Bottles & Jars" },
        ],
      },
      {
        groupName: "Musical Instruments",
        items: [
          { slug: "guitars", label: "Guitars" },
          { slug: "violins", label: "Violins" },
        ],
      },
    ],
  },
  {
    slug: "health-beauty-hair",
    label: "Health, Beauty & Hair",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=640&auto=format&fit=crop",
    groups: [
      {
        groupName: "Makeup",
        items: [
          { slug: "eyebrow-pencil", label: "Eyebrow Pencil" },
          { slug: "makeup-set", label: "Makeup Set" },
          { slug: "eyeshadow", label: "Eyeshadow" },
          { slug: "makeup-brushes", label: "Makeup Brushes" },
          { slug: "lipstick", label: "Lipstick" },
          { slug: "false-eyelashes", label: "False Eyelashes" },
        ],
      },
      {
        groupName: "Wigs & Extensions",
        items: [
          { slug: "human-hair-wigs", label: "Human Hair Wigs" },
          { slug: "synthetic-hair-pieces", label: "Synthetic Hair Pieces" },
          { slug: "synthetic-lace-wigs", label: "Synthetic Lace Wigs" },
          { slug: "human-hair-lace-wigs", label: "Human Hair Lace Wigs" },
          { slug: "hair-braids", label: "Hair Braids" },
          { slug: "synthetic-wigs", label: "Synthetic Wigs" },
        ],
      },
      {
        groupName: "Synthetic Hair",
        items: [
          { slug: "cosplay-wigs", label: "Cosplay Wigs" },
        ],
      },
      {
        groupName: "Skin Care",
        items: [
          { slug: "razor", label: "Razor" },
          { slug: "face-masks-skincare", label: "Face Masks" },
          { slug: "sun-care", label: "Sun Care" },
          { slug: "essential-oil", label: "Essential Oil" },
          { slug: "body-care", label: "Body Care" },
          { slug: "facial-care", label: "Facial Care" },
        ],
      },
      {
        groupName: "Beauty Tools",
        items: [
          { slug: "mirrors", label: "Mirrors" },
          { slug: "straightening-irons", label: "Straightening Irons" },
          { slug: "electric-face-cleanser", label: "Electric Face Cleanser" },
          { slug: "face-skin-care-tools", label: "Face Skin Care Tools" },
          { slug: "curling-iron", label: "Curling Iron" },
          { slug: "facial-steamer", label: "Facial Steamer" },
        ],
      },
      {
        groupName: "Nail Art & Tools",
        items: [
          { slug: "nail-glitters", label: "Nail Glitters" },
          { slug: "stickers-decals", label: "Stickers & Decals" },
          { slug: "nail-decorations", label: "Nail Decorations" },
          { slug: "nail-gel", label: "Nail Gel" },
          { slug: "nail-dryers", label: "Nail Dryers" },
          { slug: "nail-art-kits", label: "Nail Art Kits" },
        ],
      },
      {
        groupName: "Hair Weaves",
        items: [
          { slug: "pre-colored-one-pack", label: "Pre-Colored One Pack" },
          { slug: "hair-weaving", label: "Hair Weaving" },
          { slug: "hair-styling", label: "Hair Styling" },
          { slug: "salon-bundle-hair", label: "Salon Bundle Hair" },
          { slug: "pre-colored-hair-weave", label: "Pre-Colored Hair Weave" },
        ],
      },
      {
        groupName: "Hair & Accessories",
        items: [
          { slug: "headband-hair-band-hairpin", label: "Headband & Hair Band & Hairpin" },
          { slug: "human-hair", label: "Human Hair" },
        ],
      },
      {
        groupName: "Food & Health",
        items: [
          { slug: "health-care-products", label: "Health Care Products" },
        ],
      },
    ],
  },
  {
    slug: "jewelry-watches",
    label: "Jewelry & Watches",
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=640&auto=format&fit=crop",
    groups: [
      {
        groupName: "Women's Watches",
        items: [
          { slug: "women-sports-watches", label: "Women Sports Watches" },
          { slug: "dress-watches", label: "Dress Watches" },
          { slug: "creative-watches", label: "Creative Watches" },
          { slug: "lovers-watches", label: "Lovers Watches" },
          { slug: "women-bracelet-watches", label: "Women's Bracelet Watches" },
          { slug: "children-watches", label: "Children's Watches" },
        ],
      },
      {
        groupName: "Men's Watches",
        items: [
          { slug: "quartz-watches", label: "Quartz Watches" },
          { slug: "mechanical-watches", label: "Mechanical Watches" },
          { slug: "digital-watches", label: "Digital Watches" },
          { slug: "dual-display-watches", label: "Dual Display Watches" },
          { slug: "men-sports-watches", label: "Men Sports Watches" },
        ],
      },
      {
        groupName: "Fine Jewelry",
        items: [
          { slug: "various-gemstones", label: "Various Gemstones" },
          { slug: "925-silver-jewelry", label: "925 Silver Jewelry" },
          { slug: "k-gold", label: "K-Gold" },
          { slug: "pearls-jewelry", label: "Pearls Jewelry" },
          { slug: "fine-earrings", label: "Fine Earrings" },
          { slug: "mens-fine-jewelry", label: "Men's Fine Jewelry" },
          { slug: "fine-jewelry-sets", label: "Fine Jewelry Sets" },
        ],
      },
      {
        groupName: "Wedding & Engagement",
        items: [
          { slug: "bridal-jewelry-sets", label: "Bridal Jewelry Sets" },
          { slug: "wedding-hair-jewelry", label: "Wedding Hair Jewelry" },
          { slug: "engagement-rings", label: "Engagement Rings" },
          { slug: "wedding-engagement", label: "Wedding & Engagement" },
        ],
      },
      {
        groupName: "Fashion Jewelry",
        items: [
          { slug: "bracelets-bangles", label: "Bracelets & Bangles" },
          { slug: "brooches", label: "Brooches" },
          { slug: "keychains", label: "Keychains" },
          { slug: "charms", label: "Charms" },
          { slug: "rings", label: "Rings" },
          { slug: "body-jewelry", label: "Body Jewelry" },
          { slug: "fashion-jewelry-sets", label: "Fashion Jewelry Sets" },
          { slug: "necklace-pendants", label: "Necklace & Pendants" },
          { slug: "mens-cuff-links", label: "Men's Cuff Links" },
          { slug: "earrings", label: "Earrings" },
        ],
      },
    ],
  },
  {
    slug: "mens-clothing",
    label: "Men's Clothing",
    image: "https://images.unsplash.com/photo-1617137968427-85924c800a22?q=80&w=640&auto=format&fit=crop",
    groups: [
      {
        groupName: "Accessories",
        items: [
          { slug: "socks", label: "Socks" },
          { slug: "mens-ties", label: "Men's Ties" },
          { slug: "scarves", label: "Scarves" },
          { slug: "man-gloves-mittens", label: "Man Gloves & Mittens" },
          { slug: "skullies-beanies", label: "Skullies & Beanies" },
          { slug: "belts", label: "Belts" },
        ],
      },
      {
        groupName: "Bottoms",
        items: [
          { slug: "pajama-sets", label: "Pajama Sets" },
          { slug: "man-shorts", label: "Man Shorts" },
          { slug: "cargo-pants", label: "Cargo Pants" },
          { slug: "man-jeans", label: "Man Jeans" },
          { slug: "harem-pants", label: "Harem Pants" },
          { slug: "casual-pants", label: "Casual Pants" },
          { slug: "sweatpants", label: "Sweatpants" },
        ],
      },
      {
        groupName: "Underwear & Loungewear",
        items: [
          { slug: "mens-sleep-lounge", label: "Men's Sleep & Lounge" },
          { slug: "shorts", label: "Shorts" },
          { slug: "briefs", label: "Briefs" },
          { slug: "robes", label: "Robes" },
          { slug: "man-pajama-sets", label: "Man Pajama Sets" },
          { slug: "boxers", label: "Boxers" },
          { slug: "long-johns", label: "Long Johns" },
        ],
      },
      {
        groupName: "T-Shirts",
        items: [
          { slug: "geometric", label: "Geometric" },
          { slug: "mens-long-sleeved", label: "Men's Long-Sleeved" },
          { slug: "striped", label: "Striped" },
          { slug: "solid", label: "Solid" },
          { slug: "3d", label: "3D" },
          { slug: "print", label: "Print" },
        ],
      },
      {
        groupName: "Outerwear & Jackets",
        items: [
          { slug: "suits-blazer", label: "Suits & Blazer" },
          { slug: "mens-sweaters", label: "Men's Sweaters" },
          { slug: "genuine-leather", label: "Genuine Leather" },
          { slug: "man-trench", label: "Man Trench" },
          { slug: "mens-shirts", label: "Men's Shirts" },
          { slug: "mens-jackets", label: "Men's Jackets" },
          { slug: "mens-suits", label: "Men's Suits" },
          { slug: "man-hoodies-sweatshirts", label: "Man Hoodies & Sweatshirts" },
          { slug: "parkas", label: "Parkas" },
          { slug: "down-jackets", label: "Down Jackets" },
        ],
      },
      {
        groupName: "Hats & Caps",
        items: [
          { slug: "baseball-caps", label: "Baseball Caps" },
          { slug: "bomber-hats", label: "Bomber Hats" },
          { slug: "berets", label: "Berets" },
          { slug: "fedoras", label: "Fedoras" },
        ],
      },
    ],
  },
  {
    slug: "bags-shoes",
    label: "Bags & Shoes",
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=640&auto=format&fit=crop",
    groups: [
      {
        groupName: "Women's Shoes",
        items: [
          { slug: "woman-boots", label: "Woman Boots" },
          { slug: "vulcanize-shoes", label: "Vulcanize Shoes" },
          { slug: "womens-insoles", label: "Women's Insoles" },
          { slug: "pumps", label: "Pumps" },
          { slug: "woman-slippers", label: "Woman Slippers" },
          { slug: "woman-sandals", label: "Woman Sandals" },
          { slug: "flats", label: "Flats" },
        ],
      },
      {
        groupName: "Men's Shoes",
        items: [
          { slug: "man-boots", label: "Man Boots" },
          { slug: "formal-shoes", label: "Formal Shoes" },
          { slug: "mens-insoles", label: "Men's Insoles" },
          { slug: "man-slippers", label: "Man Slippers" },
          { slug: "vulcanize-shoe", label: "Vulcanize Shoe" },
          { slug: "man-sandals", label: "Man Sandals" },
          { slug: "casual-shoes", label: "Casual Shoes" },
        ],
      },
      {
        groupName: "Men's Luggage & Bags",
        items: [
          { slug: "briefcases", label: "Briefcases" },
          { slug: "waist-bags", label: "Waist Bags" },
          { slug: "mens-backpacks", label: "Men's Backpacks" },
          { slug: "luggage-travel-bags", label: "Luggage & Travel Bags" },
          { slug: "crossbody-bags", label: "Crossbody Bags" },
          { slug: "man-wallets", label: "Man Wallets" },
        ],
      },
      {
        groupName: "Women's Luggage & Bags",
        items: [
          { slug: "woman-wallets", label: "Woman Wallets" },
          { slug: "womens-crossbody-bags", label: "Women's Crossbody Bags" },
          { slug: "bag-accessories", label: "Bag Accessories" },
          { slug: "evening-bags", label: "Evening Bags" },
          { slug: "fashion-backpacks", label: "Fashion Backpacks" },
          { slug: "shoulder-bags", label: "Shoulder Bags" },
          { slug: "totes", label: "Totes" },
          { slug: "boys-bags", label: "Boys Bags" },
          { slug: "clutches", label: "Clutches" },
        ],
      },
    ],
  },
  {
    slug: "toys-kids-babies",
    label: "Toys, Kids & Babies",
    image: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?q=80&w=640&auto=format&fit=crop",
    groups: [
      {
        groupName: "Boys Clothing",
        items: [
          { slug: "boy-jeans", label: "Boy Jeans" },
          { slug: "boy-t-shirts", label: "Boy T-Shirts" },
          { slug: "boy-hoodies-sweatshirts", label: "Boy Hoodies & Sweatshirts" },
          { slug: "outerwear-coats", label: "Outerwear & Coats" },
          { slug: "boy-clothing-sets", label: "Boy Clothing Sets" },
          { slug: "boy-accessories", label: "Boy Accessories" },
        ],
      },
      {
        groupName: "Baby Clothing",
        items: [
          { slug: "baby-clothing-sets", label: "Baby Clothing Sets" },
          { slug: "baby-rompers", label: "Baby Rompers" },
          { slug: "baby-accessories", label: "Baby Accessories" },
          { slug: "baby-outerwear", label: "Baby Outerwear" },
          { slug: "baby-dresses", label: "Baby Dresses" },
          { slug: "baby-pants", label: "Baby Pants" },
        ],
      },
      {
        groupName: "Shoes & Bags",
        items: [
          { slug: "childrens-shoes", label: "Children's Shoes" },
          { slug: "boys-shoes", label: "Boys Shoes" },
          { slug: "school-bags", label: "School Bags" },
          { slug: "kids-wallets", label: "Kids Wallets" },
          { slug: "girls-shoes", label: "Girls Shoes" },
          { slug: "babys-first-walkers", label: "Baby's First Walkers" },
        ],
      },
      {
        groupName: "Toys & Hobbies",
        items: [
          { slug: "electronic-pets", label: "Electronic Pets" },
          { slug: "blocks", label: "Blocks" },
          { slug: "rc-helicopters", label: "RC Helicopters" },
          { slug: "stuffed-plush-animals", label: "Stuffed & Plush Animals" },
          { slug: "action-toy-figures", label: "Action & Toy Figures" },
        ],
      },
      {
        groupName: "Girls Clothing",
        items: [
          { slug: "girls-underwear", label: "Girls Underwear" },
          { slug: "family-matching-outfits", label: "Family Matching Outfits" },
          { slug: "sleepwear-robes", label: "Sleepwear & Robes" },
          { slug: "tops-tees", label: "Tops & Tees" },
          { slug: "girl-clothing-sets", label: "Girl Clothing Sets" },
          { slug: "girl-accessories", label: "Girl Accessories" },
          { slug: "girl-dresses", label: "Girl Dresses" },
        ],
      },
      {
        groupName: "Baby & Mother",
        items: [
          { slug: "nappy-changing", label: "Nappy Changing" },
          { slug: "activity-gear", label: "Activity & Gear" },
          { slug: "backpacks-carriers", label: "Backpacks & Carriers" },
          { slug: "baby-care", label: "Baby Care" },
          { slug: "maternity", label: "Maternity" },
        ],
      },
    ],
  },
  {
    slug: "sports-outdoors",
    label: "Sports & Outdoors",
    image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=640&auto=format&fit=crop",
    groups: [
      {
        groupName: "Other Sports Equipment",
        items: [
          { slug: "musical-instruments", label: "Musical Instruments" },
          { slug: "hunting", label: "Hunting" },
          { slug: "skiing-snowboarding", label: "Skiing & Snowboarding" },
          { slug: "fitness-bodybuilding", label: "Fitness & Bodybuilding" },
          { slug: "camping-hiking", label: "Camping & Hiking" },
          { slug: "golf", label: "Golf" },
        ],
      },
      {
        groupName: "Swimming",
        items: [
          { slug: "one-piece-suits", label: "One-Piece Suits" },
          { slug: "bikini-sets", label: "Bikini Sets" },
          { slug: "two-piece-suits", label: "Two-Piece Suits" },
          { slug: "mens-swimwear", label: "Men's Swimwear" },
          { slug: "cover-ups", label: "Cover-Ups" },
          { slug: "childrens-swimwear", label: "Children's Swimwear" },
        ],
      },
      {
        groupName: "Sneakers",
        items: [
          { slug: "running-shoes", label: "Running Shoes" },
          { slug: "dance-shoes", label: "Dance Shoes" },
          { slug: "skateboarding-shoes", label: "Skateboarding Shoes" },
          { slug: "hiking-shoes", label: "Hiking Shoes" },
          { slug: "soccer-shoes", label: "Soccer Shoes" },
          { slug: "basketball-shoes", label: "Basketball Shoes" },
        ],
      },
      {
        groupName: "Sportswear",
        items: [
          { slug: "jerseys", label: "Jerseys" },
          { slug: "sports-accessories", label: "Sports Accessories" },
          { slug: "outdoor-shorts", label: "Outdoor Shorts" },
          { slug: "sports-bags", label: "Sports Bags" },
          { slug: "hiking-jackets", label: "Hiking Jackets" },
          { slug: "pants", label: "Pants" },
        ],
      },
      {
        groupName: "Cycling",
        items: [
          { slug: "bicycle-lights", label: "Bicycle Lights" },
          { slug: "scooters", label: "Scooters" },
          { slug: "cycling-gloves", label: "Cycling Gloves" },
          { slug: "bicycle-helmets", label: "Bicycle Helmets" },
          { slug: "bicycle-frames", label: "Bicycle Frames" },
          { slug: "cycling-jerseys", label: "Cycling Jerseys" },
          { slug: "bicycles", label: "Bicycles" },
        ],
      },
      {
        groupName: "Fishing",
        items: [
          { slug: "fishing-reels", label: "Fishing Reels" },
          { slug: "rod-combos", label: "Rod Combos" },
          { slug: "fishing-tackle-boxes", label: "Fishing Tackle Boxes" },
          { slug: "fishing-lures", label: "Fishing Lures" },
          { slug: "fishing-rods", label: "Fishing Rods" },
          { slug: "fishing-lines", label: "Fishing Lines" },
        ],
      },
    ],
  },
  {
    slug: "consumer-electronics",
    label: "Consumer Electronics",
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=640&auto=format&fit=crop",
    groups: [
      {
        groupName: "Smart Electronics",
        items: [
          { slug: "wearable-devices", label: "Wearable Devices" },
          { slug: "smart-home-appliances", label: "Smart Home Appliances" },
          { slug: "smart-wearable-accessories", label: "Smart Wearable Accessories" },
          { slug: "smart-wristbands", label: "Smart Wristbands" },
          { slug: "smart-watches", label: "Smart Watches" },
          { slug: "smart-remote-controls", label: "Smart Remote Controls" },
        ],
      },
      {
        groupName: "Camera & Photo",
        items: [
          { slug: "photo-studio", label: "Photo Studio" },
          { slug: "camera-drones", label: "Camera Drones" },
          { slug: "camera-photo-accessories", label: "Camera & Photo Accessories" },
          { slug: "digital-cameras", label: "Digital Cameras" },
          { slug: "action-cameras", label: "Action Cameras" },
          { slug: "camcorders", label: "Camcorders" },
        ],
      },
      {
        groupName: "Accessories & Parts",
        items: [
          { slug: "digital-cables", label: "Digital Cables" },
          { slug: "home-electronic-accessories", label: "Home Electronic Accessories" },
          { slug: "audio-video-cables", label: "Audio & Video Cables" },
          { slug: "charger", label: "Charger" },
          { slug: "batteries", label: "Batteries" },
          { slug: "digital-gear-bags", label: "Digital Gear Bags" },
        ],
      },
      {
        groupName: "Video Games",
        items: [
          { slug: "gamepads", label: "Gamepads" },
          { slug: "handheld-game-players", label: "Handheld Game Players" },
          { slug: "video-game-consoles", label: "Video Game Consoles" },
          { slug: "stickers", label: "Stickers" },
          { slug: "joysticks", label: "Joysticks" },
        ],
      },
      {
        groupName: "Home Audio & Video",
        items: [
          { slug: "projectors", label: "Projectors" },
          { slug: "television", label: "Television" },
          { slug: "tv-receivers", label: "TV Receivers" },
          { slug: "audio-amplifiers", label: "Audio Amplifiers" },
          { slug: "projectors-accessories", label: "Projectors & Accessories" },
          { slug: "home-audio-video", label: "Home Audio & Video" },
          { slug: "tv-sticks", label: "TV Sticks" },
        ],
      },
      {
        groupName: "Portable Audio & Video",
        items: [
          { slug: "microphones", label: "Microphones" },
          { slug: "speakers", label: "Speakers" },
          { slug: "earphones-headphones", label: "Earphones & Headphones" },
          { slug: "vr-ar-devices", label: "VR & AR Devices" },
          { slug: "mp3-players", label: "MP3 Players" },
        ],
      },
    ],
  },
  {
    slug: "home-improvement",
    label: "Home Improvement",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=640&auto=format&fit=crop",
    groups: [
      {
        groupName: "Outdoor Lighting",
        items: [
          { slug: "flashlights-torches", label: "Flashlights & Torches" },
          { slug: "floodlights", label: "Floodlights" },
          { slug: "underwater-lights", label: "Underwater Lights" },
          { slug: "string-lights", label: "String Lights" },
          { slug: "solar-lamps", label: "Solar Lamps" },
        ],
      },
      {
        groupName: "Home Appliances",
        items: [
          { slug: "personal-care-appliances", label: "Personal Care Appliances" },
          { slug: "cleaning-appliances", label: "Cleaning Appliances" },
          { slug: "air-conditioning-appliances", label: "Air Conditioning Appliances" },
          { slug: "home-appliance-parts", label: "Home Appliance Parts" },
          { slug: "kitchen-appliances", label: "Kitchen Appliances" },
        ],
      },
      {
        groupName: "Indoor Lighting",
        items: [
          { slug: "chandeliers", label: "Chandeliers" },
          { slug: "pendant-lights", label: "Pendant Lights" },
          { slug: "downlights", label: "Downlights" },
          { slug: "night-lights", label: "Night Lights" },
          { slug: "wall-lamps", label: "Wall Lamps" },
          { slug: "ceiling-lights", label: "Ceiling Lights" },
        ],
      },
      {
        groupName: "LED Lighting",
        items: [
          { slug: "led-spotlights", label: "LED Spotlights" },
        ],
      },
      {
        groupName: "Tools",
        items: [
          { slug: "measurement-analysis", label: "Measurement & Analysis" },
          { slug: "welding-soldering-supplies", label: "Welding & Soldering Supplies" },
          { slug: "welding-equipment", label: "Welding Equipment" },
          { slug: "hand-tools", label: "Hand Tools" },
          { slug: "tool-sets", label: "Tool Sets" },
          { slug: "tools-storage", label: "Tools Storage" },
          { slug: "machine-tools-accessories", label: "Machine Tools & Accessories" },
          { slug: "power-tools", label: "Power Tools" },
          { slug: "woodworking-machinery", label: "Woodworking Machinery" },
          { slug: "garden-tools", label: "Garden Tools" },
        ],
      },
    ],
  },
  {
    slug: "automobiles-motorcycles",
    label: "Automobiles & Motorcycles",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=640&auto=format&fit=crop",
    groups: [
      {
        groupName: "Motorcycle Accessories & Parts",
        items: [
          { slug: "lighting", label: "Lighting" },
          { slug: "exhaust-exhaust-systems", label: "Exhaust & Exhaust Systems" },
          { slug: "motor-brake-system", label: "Motor Brake System" },
          { slug: "motorcycle-seat-covers", label: "Motorcycle Seat Covers" },
          { slug: "other-motorcycle-accessories", label: "Other Motorcycle Accessories" },
          { slug: "helmet-headset", label: "Helmet Headset" },
          { slug: "body-frame", label: "Body & Frame" },
        ],
      },
      {
        groupName: "Interior Accessories",
        items: [
          { slug: "floor-mats", label: "Floor Mats" },
          { slug: "key-case-for-car", label: "Key Case for Car" },
          { slug: "steering-covers", label: "Steering Covers" },
          { slug: "automobiles-seat-covers", label: "Automobiles Seat Covers" },
          { slug: "stowing-tidying", label: "Stowing Tidying" },
        ],
      },
      {
        groupName: "Auto Replacement Parts",
        items: [
          { slug: "interior-parts", label: "Interior Parts" },
          { slug: "car-brake-system", label: "Car Brake System" },
          { slug: "spark-plugs-ignition-system", label: "Spark Plugs & Ignition System" },
          { slug: "automobiles-sensors", label: "Automobiles Sensors" },
          { slug: "exterior-parts", label: "Exterior Parts" },
          { slug: "other-replacement-parts", label: "Other Replacement Parts" },
          { slug: "car-lights", label: "Car Lights" },
          { slug: "windscreen-wipers-windows", label: "Windscreen Wipers & Windows" },
        ],
      },
      {
        groupName: "Tools, Maintenance & Care",
        items: [
          { slug: "car-washer", label: "Car Washer" },
          { slug: "diagnostic-tools", label: "Diagnostic Tools" },
          { slug: "paint-care", label: "Paint Care" },
          { slug: "other-maintenance-products", label: "Other Maintenance Products" },
        ],
      },
      {
        groupName: "Car Electronics",
        items: [
          { slug: "vehicle-camera", label: "Vehicle Camera" },
          { slug: "dvr-dash-camera", label: "DVR & Dash Camera" },
          { slug: "car-monitors", label: "Car Monitors" },
          { slug: "vehicle-gps", label: "Vehicle GPS" },
          { slug: "car-mirror-video", label: "Car Mirror Video" },
          { slug: "car-radios", label: "Car Radios" },
        ],
      },
    ],
  },
  {
    slug: "phones-accessories",
    label: "Phones & Accessories",
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=640&auto=format&fit=crop",
    groups: [
      {
        groupName: "Mobile Phone Parts",
        items: [
          { slug: "sim-card-tools", label: "SIM Card & Tools" },
          { slug: "mobile-batteries", label: "Mobile Batteries" },
          { slug: "housings", label: "Housings" },
          { slug: "lcds", label: "LCDs" },
          { slug: "flex-cables", label: "Flex Cables" },
          { slug: "touch-panel", label: "Touch Panel" },
        ],
      },
      {
        groupName: "Mobile Phones",
        items: [
          { slug: "quad-core", label: "Quad Core" },
          { slug: "single-sim-card", label: "Single SIM Card" },
          { slug: "dual-sim-card", label: "Dual SIM Card" },
          { slug: "3gb-ram", label: "3GB RAM" },
          { slug: "octa-core", label: "Octa Core" },
          { slug: "5-inch-display", label: "5-inch Display" },
        ],
      },
      {
        groupName: "Mobile Phone Accessories",
        items: [
          { slug: "cables", label: "Cables" },
          { slug: "power-bank", label: "Power Bank" },
          { slug: "screen-protectors", label: "Screen Protectors" },
          { slug: "lenses", label: "Lenses" },
          { slug: "holders-stands", label: "Holders & Stands" },
          { slug: "chargers", label: "Chargers" },
        ],
      },
      {
        groupName: "Cases & Covers",
        items: [
          { slug: "huawei-cases", label: "Huawei Cases" },
          { slug: "patterned-cases", label: "Patterned Cases" },
          { slug: "cases-iphone-6-6-plus", label: "Cases For iPhone 6 & 6 Plus" },
          { slug: "wallet-cases", label: "Wallet Cases" },
          { slug: "cases-iphone-7-7-plus", label: "Cases For iPhone 7 & 7 Plus" },
          { slug: "galaxy-s8-cases", label: "Galaxy S8 Cases" },
        ],
      },
    ],
  },
  {
    slug: "computer-office",
    label: "Computer & Office",
    image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=640&auto=format&fit=crop",
    groups: [
      {
        groupName: "Storage Devices",
        items: [
          { slug: "ssd", label: "SSD" },
          { slug: "usb-flash-drives", label: "USB Flash Drives" },
          { slug: "hdd-enclosures", label: "HDD Enclosures" },
          { slug: "memory-cards", label: "Memory Cards" },
          { slug: "external-hard-drives", label: "External Hard Drives" },
        ],
      },
      {
        groupName: "Tablet & Laptop Accessories",
        items: [
          { slug: "tablet-lcd-screens", label: "Tablet LCD Screens" },
          { slug: "laptop-batteries", label: "Laptop Batteries" },
          { slug: "laptop-bags-cases", label: "Laptop Bags & Cases" },
          { slug: "tablet-cases", label: "Tablet Cases" },
          { slug: "tablet-accessories", label: "Tablet Accessories" },
        ],
      },
      {
        groupName: "Security & Protection",
        items: [
          { slug: "alarm-sensor", label: "Alarm & Sensor" },
          { slug: "fire-protection", label: "Fire Protection" },
          { slug: "workplace-safety-supplies", label: "Workplace Safety Supplies" },
          { slug: "door-intercom", label: "Door Intercom" },
          { slug: "surveillance-products", label: "Surveillance Products" },
        ],
      },
      {
        groupName: "Laptop & Tablets",
        items: [
          { slug: "phone-call-tablets", label: "Phone Call Tablets" },
          { slug: "2-in-1-tablets", label: "2 in 1 Tablets" },
          { slug: "laptops", label: "Laptops" },
          { slug: "tablets", label: "Tablets" },
          { slug: "gaming-laptops", label: "Gaming Laptops" },
        ],
      },
      {
        groupName: "Office Electronics",
        items: [
          { slug: "office-school-supplies", label: "Office & School Supplies" },
          { slug: "computer-tablet-accessories", label: "Computer Tablet Accessories" },
          { slug: "printer-supplies", label: "Printer Supplies" },
          { slug: "3d-printers", label: "3D Printers" },
          { slug: "3d-pens", label: "3D Pens" },
          { slug: "printers", label: "Printers" },
        ],
      },
      {
        groupName: "Networking",
        items: [
          { slug: "modem-router-combos", label: "Modem-Router Combos" },
          { slug: "3g-modems", label: "3G Modems" },
          { slug: "network-cards", label: "Network Cards" },
        ],
      },
    ],
  },
];

export function getAllSubcategories(): FullCategoryChild[] {
  const allChildren: FullCategoryChild[] = [];
  for (const cat of FULL_CATEGORIES) {
    if (cat.groups) {
      for (const group of cat.groups) {
        for (const item of group.items) {
          allChildren.push({ slug: item.slug, label: item.label });
        }
      }
    }
    if (cat.children) {
      allChildren.push(...cat.children);
    }
  }
  return allChildren;
}

export function flattenCategoryChildren(category: FullCategory): FullCategoryChild[] {
  const children: FullCategoryChild[] = [];
  if (category.groups) {
    for (const group of category.groups) {
      for (const item of group.items) {
        children.push({ slug: item.slug, label: item.label });
      }
    }
  }
  if (category.children) {
    children.push(...category.children);
  }
  return children;
}
