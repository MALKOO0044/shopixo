import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export type GenderType = "women" | "men" | "kids" | "unisex" | "baby" | null;

export type CategoryMatch = {
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  matchType: "primary" | "parent" | "gender" | "keyword" | "cross-category";
  confidence: number;
};

export type IntelligenceResult = {
  detectedGender: GenderType;
  extractedKeywords: string[];
  matchedCategories: CategoryMatch[];
  primaryCategoryId: number | null;
};

type NonNullGender = Exclude<GenderType, null>;

const GENDER_KEYWORDS: Record<NonNullGender, string[]> = {
  women: [
    "women", "woman", "womens", "women's", "ladies", "lady", "female", "feminine",
    "girl", "girls", "her", "she", "miss", "mrs", "mama", "mom", "mother",
    "bridal", "bride", "maternity", "pregnant", "pregnancy"
  ],
  men: [
    "men", "man", "mens", "men's", "male", "masculine", "gentleman", "gentlemen",
    "boy", "boys", "his", "he", "mr", "father", "dad", "papa", "groom"
  ],
  kids: [
    "kid", "kids", "child", "children", "junior", "youth", "teen", "teenager",
    "toddler", "infant", "school"
  ],
  baby: [
    "baby", "babies", "newborn", "infant", "nursery", "diaper", "onesie"
  ],
  unisex: [
    "unisex", "neutral", "both", "all gender", "anyone"
  ]
};

const MAIN_CATEGORY_IDS = {
  WOMENS_CLOTHING: 1,
  PET_SUPPLIES: 2,
  HOME_GARDEN_FURNITURE: 3,
  HEALTH_BEAUTY_HAIR: 4,
  JEWELRY_WATCHES: 5,
  MENS_CLOTHING: 6,
  BAGS_SHOES: 7,
  TOYS_KIDS_BABIES: 8,
  SPORTS_OUTDOORS: 9,
  CONSUMER_ELECTRONICS: 10,
  HOME_IMPROVEMENT: 11,
  AUTOMOBILES_MOTORCYCLES: 12,
  PHONES_ACCESSORIES: 13,
  COMPUTER_OFFICE: 14
};

const KEYWORD_CATEGORY_MAP: Record<string, { mainCategoryId: number; slugPatterns: string[]; priority: number }[]> = {
  dress: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["dress", "wedding", "party"], priority: 10 }
  ],
  dresses: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["dress", "wedding", "party"], priority: 10 }
  ],
  blouse: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["blouse", "shirt", "tops"], priority: 10 }
  ],
  blouses: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["blouse", "shirt", "tops"], priority: 10 }
  ],
  shirt: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["shirt", "tops", "blouse"], priority: 5 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["shirt", "tops", "tshirt"], priority: 5 }
  ],
  tshirt: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["tshirt", "tops"], priority: 5 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["tshirt", "tops"], priority: 5 }
  ],
  blazer: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["blazer", "outerwear", "jacket"], priority: 10 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["suit", "outerwear"], priority: 5 }
  ],
  blazers: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["blazer", "outerwear", "jacket"], priority: 10 }
  ],
  jacket: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["outerwear", "jacket", "coat"], priority: 5 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["outerwear", "jacket", "coat"], priority: 5 }
  ],
  coat: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["outerwear", "coat", "jacket"], priority: 5 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["outerwear", "coat", "jacket"], priority: 5 }
  ],
  sweater: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["sweater", "knitwear", "tops"], priority: 5 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["sweater", "knitwear"], priority: 5 }
  ],
  cardigan: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["cardigan", "sweater", "knitwear"], priority: 8 }
  ],
  hoodie: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["hoodie", "sweatshirt"], priority: 5 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["hoodie", "hoodies", "sweatshirt"], priority: 5 }
  ],
  sweatshirt: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["sweatshirt", "hoodie"], priority: 5 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["sweatshirt", "hoodie"], priority: 5 }
  ],
  pants: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["pants", "trousers", "bottom"], priority: 5 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["pants", "bottom", "casual"], priority: 5 }
  ],
  trousers: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["trousers", "pants", "bottom"], priority: 5 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["pants", "bottom"], priority: 5 }
  ],
  jeans: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["jeans", "denim", "bottom"], priority: 8 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["jeans", "denim", "bottom"], priority: 8 }
  ],
  shorts: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["shorts", "bottom"], priority: 5 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["shorts", "bottom"], priority: 5 }
  ],
  skirt: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["skirt", "bottom"], priority: 10 }
  ],
  skirts: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["skirt", "bottom"], priority: 10 }
  ],
  lingerie: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["lingerie", "underwear", "intimate"], priority: 10 }
  ],
  bra: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["lingerie", "underwear", "bra"], priority: 10 }
  ],
  underwear: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["underwear", "lingerie"], priority: 5 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["underwear", "loungewear"], priority: 5 }
  ],
  bikini: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["bikini", "swimwear", "beachwear"], priority: 10 }
  ],
  swimsuit: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["swimwear", "beachwear"], priority: 8 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["swimwear"], priority: 5 }
  ],
  swimwear: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["swimwear", "beachwear"], priority: 8 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["swimwear"], priority: 5 }
  ],
  jumpsuit: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["jumpsuit", "romper"], priority: 10 }
  ],
  romper: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["romper", "jumpsuit"], priority: 10 }
  ],
  suit: [
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["suit", "formal"], priority: 8 },
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["suit", "blazer"], priority: 5 }
  ],
  polo: [
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["polo", "shirt"], priority: 8 }
  ],
  sock: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["sock", "accessory"], priority: 10 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["sock", "accessory"], priority: 8 }
  ],
  socks: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["sock", "accessory"], priority: 10 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["sock", "accessory"], priority: 8 }
  ],
  wool: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["wool", "sock", "sweater", "knitwear"], priority: 5 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["wool", "sock", "sweater"], priority: 5 }
  ],
  
  shoe: [
    { mainCategoryId: MAIN_CATEGORY_IDS.BAGS_SHOES, slugPatterns: ["shoe"], priority: 10 }
  ],
  shoes: [
    { mainCategoryId: MAIN_CATEGORY_IDS.BAGS_SHOES, slugPatterns: ["shoe"], priority: 10 }
  ],
  sneaker: [
    { mainCategoryId: MAIN_CATEGORY_IDS.BAGS_SHOES, slugPatterns: ["sneaker", "shoe"], priority: 10 },
    { mainCategoryId: MAIN_CATEGORY_IDS.SPORTS_OUTDOORS, slugPatterns: ["sneaker"], priority: 8 }
  ],
  sneakers: [
    { mainCategoryId: MAIN_CATEGORY_IDS.BAGS_SHOES, slugPatterns: ["sneaker", "shoe"], priority: 10 },
    { mainCategoryId: MAIN_CATEGORY_IDS.SPORTS_OUTDOORS, slugPatterns: ["sneaker"], priority: 8 }
  ],
  boot: [
    { mainCategoryId: MAIN_CATEGORY_IDS.BAGS_SHOES, slugPatterns: ["boot", "shoe"], priority: 10 }
  ],
  boots: [
    { mainCategoryId: MAIN_CATEGORY_IDS.BAGS_SHOES, slugPatterns: ["boot", "shoe"], priority: 10 }
  ],
  sandal: [
    { mainCategoryId: MAIN_CATEGORY_IDS.BAGS_SHOES, slugPatterns: ["sandal", "shoe"], priority: 10 }
  ],
  sandals: [
    { mainCategoryId: MAIN_CATEGORY_IDS.BAGS_SHOES, slugPatterns: ["sandal", "shoe"], priority: 10 }
  ],
  heel: [
    { mainCategoryId: MAIN_CATEGORY_IDS.BAGS_SHOES, slugPatterns: ["heel", "shoe", "womens"], priority: 10 }
  ],
  heels: [
    { mainCategoryId: MAIN_CATEGORY_IDS.BAGS_SHOES, slugPatterns: ["heel", "shoe", "womens"], priority: 10 }
  ],
  loafer: [
    { mainCategoryId: MAIN_CATEGORY_IDS.BAGS_SHOES, slugPatterns: ["loafer", "shoe"], priority: 10 }
  ],
  loafers: [
    { mainCategoryId: MAIN_CATEGORY_IDS.BAGS_SHOES, slugPatterns: ["loafer", "shoe"], priority: 10 }
  ],
  flat: [
    { mainCategoryId: MAIN_CATEGORY_IDS.BAGS_SHOES, slugPatterns: ["flat", "shoe", "womens"], priority: 8 }
  ],
  flats: [
    { mainCategoryId: MAIN_CATEGORY_IDS.BAGS_SHOES, slugPatterns: ["flat", "shoe", "womens"], priority: 8 }
  ],
  slipper: [
    { mainCategoryId: MAIN_CATEGORY_IDS.BAGS_SHOES, slugPatterns: ["slipper", "slide", "shoe"], priority: 8 }
  ],
  slippers: [
    { mainCategoryId: MAIN_CATEGORY_IDS.BAGS_SHOES, slugPatterns: ["slipper", "slide", "shoe"], priority: 8 }
  ],
  
  bag: [
    { mainCategoryId: MAIN_CATEGORY_IDS.BAGS_SHOES, slugPatterns: ["bag", "luggage"], priority: 10 }
  ],
  bags: [
    { mainCategoryId: MAIN_CATEGORY_IDS.BAGS_SHOES, slugPatterns: ["bag", "luggage"], priority: 10 }
  ],
  handbag: [
    { mainCategoryId: MAIN_CATEGORY_IDS.BAGS_SHOES, slugPatterns: ["bag", "luggage", "womens"], priority: 10 }
  ],
  purse: [
    { mainCategoryId: MAIN_CATEGORY_IDS.BAGS_SHOES, slugPatterns: ["bag", "luggage", "womens"], priority: 10 }
  ],
  wallet: [
    { mainCategoryId: MAIN_CATEGORY_IDS.BAGS_SHOES, slugPatterns: ["bag", "wallet", "accessory"], priority: 8 }
  ],
  backpack: [
    { mainCategoryId: MAIN_CATEGORY_IDS.BAGS_SHOES, slugPatterns: ["bag", "backpack", "luggage"], priority: 10 }
  ],
  luggage: [
    { mainCategoryId: MAIN_CATEGORY_IDS.BAGS_SHOES, slugPatterns: ["luggage", "bag"], priority: 10 }
  ],
  suitcase: [
    { mainCategoryId: MAIN_CATEGORY_IDS.BAGS_SHOES, slugPatterns: ["luggage", "bag"], priority: 10 }
  ],
  
  necklace: [
    { mainCategoryId: MAIN_CATEGORY_IDS.JEWELRY_WATCHES, slugPatterns: ["necklace", "jewelry", "fashion"], priority: 10 }
  ],
  bracelet: [
    { mainCategoryId: MAIN_CATEGORY_IDS.JEWELRY_WATCHES, slugPatterns: ["bracelet", "jewelry", "fashion"], priority: 10 }
  ],
  earring: [
    { mainCategoryId: MAIN_CATEGORY_IDS.JEWELRY_WATCHES, slugPatterns: ["earring", "jewelry", "fashion"], priority: 10 }
  ],
  earrings: [
    { mainCategoryId: MAIN_CATEGORY_IDS.JEWELRY_WATCHES, slugPatterns: ["earring", "jewelry", "fashion"], priority: 10 }
  ],
  ring: [
    { mainCategoryId: MAIN_CATEGORY_IDS.JEWELRY_WATCHES, slugPatterns: ["ring", "jewelry", "wedding"], priority: 10 }
  ],
  rings: [
    { mainCategoryId: MAIN_CATEGORY_IDS.JEWELRY_WATCHES, slugPatterns: ["ring", "jewelry"], priority: 10 }
  ],
  watch: [
    { mainCategoryId: MAIN_CATEGORY_IDS.JEWELRY_WATCHES, slugPatterns: ["watch"], priority: 10 }
  ],
  watches: [
    { mainCategoryId: MAIN_CATEGORY_IDS.JEWELRY_WATCHES, slugPatterns: ["watch"], priority: 10 }
  ],
  pendant: [
    { mainCategoryId: MAIN_CATEGORY_IDS.JEWELRY_WATCHES, slugPatterns: ["pendant", "necklace", "jewelry"], priority: 10 }
  ],
  brooch: [
    { mainCategoryId: MAIN_CATEGORY_IDS.JEWELRY_WATCHES, slugPatterns: ["brooch", "jewelry", "accessory"], priority: 10 }
  ],
  anklet: [
    { mainCategoryId: MAIN_CATEGORY_IDS.JEWELRY_WATCHES, slugPatterns: ["anklet", "jewelry"], priority: 10 }
  ],
  
  makeup: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HEALTH_BEAUTY_HAIR, slugPatterns: ["makeup", "beauty"], priority: 10 }
  ],
  lipstick: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HEALTH_BEAUTY_HAIR, slugPatterns: ["makeup", "lip"], priority: 10 }
  ],
  mascara: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HEALTH_BEAUTY_HAIR, slugPatterns: ["makeup", "eye"], priority: 10 }
  ],
  foundation: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HEALTH_BEAUTY_HAIR, slugPatterns: ["makeup", "face"], priority: 10 }
  ],
  skincare: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HEALTH_BEAUTY_HAIR, slugPatterns: ["skin", "care"], priority: 10 }
  ],
  serum: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HEALTH_BEAUTY_HAIR, slugPatterns: ["skin", "care"], priority: 10 }
  ],
  moisturizer: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HEALTH_BEAUTY_HAIR, slugPatterns: ["skin", "care"], priority: 10 }
  ],
  sunscreen: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HEALTH_BEAUTY_HAIR, slugPatterns: ["skin", "care"], priority: 10 }
  ],
  perfume: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HEALTH_BEAUTY_HAIR, slugPatterns: ["beauty", "fragrance"], priority: 10 }
  ],
  fragrance: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HEALTH_BEAUTY_HAIR, slugPatterns: ["beauty", "fragrance"], priority: 10 }
  ],
  shampoo: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HEALTH_BEAUTY_HAIR, slugPatterns: ["hair", "care"], priority: 10 }
  ],
  conditioner: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HEALTH_BEAUTY_HAIR, slugPatterns: ["hair", "care"], priority: 10 }
  ],
  wig: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HEALTH_BEAUTY_HAIR, slugPatterns: ["wig", "hair", "extension"], priority: 10 }
  ],
  wigs: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HEALTH_BEAUTY_HAIR, slugPatterns: ["wig", "hair", "extension"], priority: 10 }
  ],
  extension: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HEALTH_BEAUTY_HAIR, slugPatterns: ["extension", "hair", "weave"], priority: 10 }
  ],
  extensions: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HEALTH_BEAUTY_HAIR, slugPatterns: ["extension", "hair", "weave"], priority: 10 }
  ],
  nail: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HEALTH_BEAUTY_HAIR, slugPatterns: ["nail", "art", "tool"], priority: 10 }
  ],
  nails: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HEALTH_BEAUTY_HAIR, slugPatterns: ["nail", "art", "tool"], priority: 10 }
  ],
  
  sofa: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["furniture", "living"], priority: 10 }
  ],
  chair: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["furniture"], priority: 8 },
    { mainCategoryId: MAIN_CATEGORY_IDS.COMPUTER_OFFICE, slugPatterns: ["office", "chair"], priority: 5 }
  ],
  table: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["furniture", "table"], priority: 8 }
  ],
  desk: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["furniture", "desk"], priority: 5 },
    { mainCategoryId: MAIN_CATEGORY_IDS.COMPUTER_OFFICE, slugPatterns: ["office", "desk"], priority: 8 }
  ],
  bed: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["furniture", "bed", "bedroom"], priority: 10 }
  ],
  mattress: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["bed", "bedroom", "sleep"], priority: 10 }
  ],
  pillow: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["textile", "bed", "home"], priority: 10 }
  ],
  blanket: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["textile", "home"], priority: 10 }
  ],
  curtain: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["textile", "home", "window"], priority: 10 }
  ],
  curtains: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["textile", "home", "window"], priority: 10 }
  ],
  rug: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["textile", "home", "floor"], priority: 10 }
  ],
  carpet: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["textile", "home", "floor"], priority: 10 }
  ],
  lamp: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_IMPROVEMENT, slugPatterns: ["light", "indoor"], priority: 8 },
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["decor", "home"], priority: 5 }
  ],
  light: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_IMPROVEMENT, slugPatterns: ["light", "led"], priority: 10 }
  ],
  lighting: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_IMPROVEMENT, slugPatterns: ["light", "led", "indoor", "outdoor"], priority: 10 }
  ],
  kitchen: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["kitchen", "dining", "cook"], priority: 10 }
  ],
  cookware: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["kitchen", "cook"], priority: 10 }
  ],
  garden: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["garden", "outdoor"], priority: 10 }
  ],
  plant: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["garden", "plant"], priority: 10 }
  ],
  plants: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["garden", "plant"], priority: 10 }
  ],
  vase: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["decor", "home"], priority: 10 }
  ],
  decoration: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["decor", "home"], priority: 10 }
  ],
  storage: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["storage", "organize"], priority: 10 }
  ],
  
  toy: [
    { mainCategoryId: MAIN_CATEGORY_IDS.TOYS_KIDS_BABIES, slugPatterns: ["toy", "hobby"], priority: 10 }
  ],
  toys: [
    { mainCategoryId: MAIN_CATEGORY_IDS.TOYS_KIDS_BABIES, slugPatterns: ["toy", "hobby"], priority: 10 }
  ],
  doll: [
    { mainCategoryId: MAIN_CATEGORY_IDS.TOYS_KIDS_BABIES, slugPatterns: ["toy", "doll"], priority: 10 }
  ],
  puzzle: [
    { mainCategoryId: MAIN_CATEGORY_IDS.TOYS_KIDS_BABIES, slugPatterns: ["toy", "puzzle", "game"], priority: 10 }
  ],
  game: [
    { mainCategoryId: MAIN_CATEGORY_IDS.TOYS_KIDS_BABIES, slugPatterns: ["toy", "game"], priority: 5 },
    { mainCategoryId: MAIN_CATEGORY_IDS.CONSUMER_ELECTRONICS, slugPatterns: ["video", "game"], priority: 8 }
  ],
  lego: [
    { mainCategoryId: MAIN_CATEGORY_IDS.TOYS_KIDS_BABIES, slugPatterns: ["toy", "building", "block"], priority: 10 }
  ],
  block: [
    { mainCategoryId: MAIN_CATEGORY_IDS.TOYS_KIDS_BABIES, slugPatterns: ["toy", "building"], priority: 8 }
  ],
  baby: [
    { mainCategoryId: MAIN_CATEGORY_IDS.TOYS_KIDS_BABIES, slugPatterns: ["baby", "mother"], priority: 10 }
  ],
  stroller: [
    { mainCategoryId: MAIN_CATEGORY_IDS.TOYS_KIDS_BABIES, slugPatterns: ["baby", "mother", "stroller"], priority: 10 }
  ],
  diaper: [
    { mainCategoryId: MAIN_CATEGORY_IDS.TOYS_KIDS_BABIES, slugPatterns: ["baby", "diaper"], priority: 10 }
  ],
  onesie: [
    { mainCategoryId: MAIN_CATEGORY_IDS.TOYS_KIDS_BABIES, slugPatterns: ["baby", "clothing"], priority: 10 }
  ],
  
  pet: [
    { mainCategoryId: MAIN_CATEGORY_IDS.PET_SUPPLIES, slugPatterns: ["pet"], priority: 10 }
  ],
  dog: [
    { mainCategoryId: MAIN_CATEGORY_IDS.PET_SUPPLIES, slugPatterns: ["pet", "dog"], priority: 10 }
  ],
  cat: [
    { mainCategoryId: MAIN_CATEGORY_IDS.PET_SUPPLIES, slugPatterns: ["pet", "cat"], priority: 10 }
  ],
  fish: [
    { mainCategoryId: MAIN_CATEGORY_IDS.PET_SUPPLIES, slugPatterns: ["fish", "aquatic"], priority: 10 }
  ],
  aquarium: [
    { mainCategoryId: MAIN_CATEGORY_IDS.PET_SUPPLIES, slugPatterns: ["fish", "aquatic", "aquarium"], priority: 10 }
  ],
  bird: [
    { mainCategoryId: MAIN_CATEGORY_IDS.PET_SUPPLIES, slugPatterns: ["bird"], priority: 10 }
  ],
  collar: [
    { mainCategoryId: MAIN_CATEGORY_IDS.PET_SUPPLIES, slugPatterns: ["collar", "harness"], priority: 10 }
  ],
  leash: [
    { mainCategoryId: MAIN_CATEGORY_IDS.PET_SUPPLIES, slugPatterns: ["collar", "harness", "leash"], priority: 10 }
  ],
  
  running: [
    { mainCategoryId: MAIN_CATEGORY_IDS.SPORTS_OUTDOORS, slugPatterns: ["sport", "running", "athletic"], priority: 10 },
    { mainCategoryId: MAIN_CATEGORY_IDS.BAGS_SHOES, slugPatterns: ["sneaker", "sport"], priority: 8 }
  ],
  athletic: [
    { mainCategoryId: MAIN_CATEGORY_IDS.SPORTS_OUTDOORS, slugPatterns: ["sport", "athletic"], priority: 10 }
  ],
  sport: [
    { mainCategoryId: MAIN_CATEGORY_IDS.SPORTS_OUTDOORS, slugPatterns: ["sport"], priority: 10 }
  ],
  sports: [
    { mainCategoryId: MAIN_CATEGORY_IDS.SPORTS_OUTDOORS, slugPatterns: ["sport"], priority: 10 }
  ],
  sportswear: [
    { mainCategoryId: MAIN_CATEGORY_IDS.SPORTS_OUTDOORS, slugPatterns: ["sportswear", "sport"], priority: 10 }
  ],
  fitness: [
    { mainCategoryId: MAIN_CATEGORY_IDS.SPORTS_OUTDOORS, slugPatterns: ["sport", "fitness", "gym"], priority: 10 }
  ],
  gym: [
    { mainCategoryId: MAIN_CATEGORY_IDS.SPORTS_OUTDOORS, slugPatterns: ["sport", "fitness", "gym"], priority: 10 }
  ],
  yoga: [
    { mainCategoryId: MAIN_CATEGORY_IDS.SPORTS_OUTDOORS, slugPatterns: ["sport", "yoga", "fitness"], priority: 10 }
  ],
  cycling: [
    { mainCategoryId: MAIN_CATEGORY_IDS.SPORTS_OUTDOORS, slugPatterns: ["cycling", "bike"], priority: 10 }
  ],
  bicycle: [
    { mainCategoryId: MAIN_CATEGORY_IDS.SPORTS_OUTDOORS, slugPatterns: ["cycling", "bike"], priority: 10 }
  ],
  bike: [
    { mainCategoryId: MAIN_CATEGORY_IDS.SPORTS_OUTDOORS, slugPatterns: ["cycling", "bike"], priority: 10 }
  ],
  swim: [
    { mainCategoryId: MAIN_CATEGORY_IDS.SPORTS_OUTDOORS, slugPatterns: ["swim", "water"], priority: 10 }
  ],
  swimming: [
    { mainCategoryId: MAIN_CATEGORY_IDS.SPORTS_OUTDOORS, slugPatterns: ["swim", "water"], priority: 10 }
  ],
  fishing: [
    { mainCategoryId: MAIN_CATEGORY_IDS.SPORTS_OUTDOORS, slugPatterns: ["fishing"], priority: 10 }
  ],
  camping: [
    { mainCategoryId: MAIN_CATEGORY_IDS.SPORTS_OUTDOORS, slugPatterns: ["outdoor", "camping"], priority: 10 }
  ],
  hiking: [
    { mainCategoryId: MAIN_CATEGORY_IDS.SPORTS_OUTDOORS, slugPatterns: ["outdoor", "hiking"], priority: 10 }
  ],
  outdoor: [
    { mainCategoryId: MAIN_CATEGORY_IDS.SPORTS_OUTDOORS, slugPatterns: ["outdoor"], priority: 10 }
  ],
  
  phone: [
    { mainCategoryId: MAIN_CATEGORY_IDS.PHONES_ACCESSORIES, slugPatterns: ["phone", "mobile"], priority: 10 }
  ],
  smartphone: [
    { mainCategoryId: MAIN_CATEGORY_IDS.PHONES_ACCESSORIES, slugPatterns: ["smart", "phone"], priority: 10 }
  ],
  iphone: [
    { mainCategoryId: MAIN_CATEGORY_IDS.PHONES_ACCESSORIES, slugPatterns: ["phone", "case", "cover"], priority: 10 }
  ],
  samsung: [
    { mainCategoryId: MAIN_CATEGORY_IDS.PHONES_ACCESSORIES, slugPatterns: ["phone", "case", "cover"], priority: 10 }
  ],
  case: [
    { mainCategoryId: MAIN_CATEGORY_IDS.PHONES_ACCESSORIES, slugPatterns: ["case", "cover"], priority: 8 }
  ],
  charger: [
    { mainCategoryId: MAIN_CATEGORY_IDS.PHONES_ACCESSORIES, slugPatterns: ["accessory", "charger"], priority: 8 },
    { mainCategoryId: MAIN_CATEGORY_IDS.CONSUMER_ELECTRONICS, slugPatterns: ["accessory", "charger"], priority: 5 }
  ],
  cable: [
    { mainCategoryId: MAIN_CATEGORY_IDS.PHONES_ACCESSORIES, slugPatterns: ["accessory", "cable"], priority: 8 }
  ],
  headphone: [
    { mainCategoryId: MAIN_CATEGORY_IDS.CONSUMER_ELECTRONICS, slugPatterns: ["audio", "headphone"], priority: 10 }
  ],
  headphones: [
    { mainCategoryId: MAIN_CATEGORY_IDS.CONSUMER_ELECTRONICS, slugPatterns: ["audio", "headphone"], priority: 10 }
  ],
  earphone: [
    { mainCategoryId: MAIN_CATEGORY_IDS.CONSUMER_ELECTRONICS, slugPatterns: ["audio", "earphone"], priority: 10 }
  ],
  earbuds: [
    { mainCategoryId: MAIN_CATEGORY_IDS.CONSUMER_ELECTRONICS, slugPatterns: ["audio", "earphone"], priority: 10 }
  ],
  speaker: [
    { mainCategoryId: MAIN_CATEGORY_IDS.CONSUMER_ELECTRONICS, slugPatterns: ["audio", "speaker"], priority: 10 }
  ],
  bluetooth: [
    { mainCategoryId: MAIN_CATEGORY_IDS.CONSUMER_ELECTRONICS, slugPatterns: ["audio", "bluetooth"], priority: 8 }
  ],
  camera: [
    { mainCategoryId: MAIN_CATEGORY_IDS.CONSUMER_ELECTRONICS, slugPatterns: ["camera", "photo"], priority: 10 }
  ],
  drone: [
    { mainCategoryId: MAIN_CATEGORY_IDS.CONSUMER_ELECTRONICS, slugPatterns: ["camera", "drone"], priority: 10 }
  ],
  smartwatch: [
    { mainCategoryId: MAIN_CATEGORY_IDS.CONSUMER_ELECTRONICS, slugPatterns: ["smart", "wearable"], priority: 10 },
    { mainCategoryId: MAIN_CATEGORY_IDS.JEWELRY_WATCHES, slugPatterns: ["watch"], priority: 5 }
  ],
  tv: [
    { mainCategoryId: MAIN_CATEGORY_IDS.CONSUMER_ELECTRONICS, slugPatterns: ["audio", "video", "tv"], priority: 10 }
  ],
  television: [
    { mainCategoryId: MAIN_CATEGORY_IDS.CONSUMER_ELECTRONICS, slugPatterns: ["audio", "video", "tv"], priority: 10 }
  ],
  console: [
    { mainCategoryId: MAIN_CATEGORY_IDS.CONSUMER_ELECTRONICS, slugPatterns: ["video", "game"], priority: 10 }
  ],
  playstation: [
    { mainCategoryId: MAIN_CATEGORY_IDS.CONSUMER_ELECTRONICS, slugPatterns: ["video", "game"], priority: 10 }
  ],
  xbox: [
    { mainCategoryId: MAIN_CATEGORY_IDS.CONSUMER_ELECTRONICS, slugPatterns: ["video", "game"], priority: 10 }
  ],
  
  laptop: [
    { mainCategoryId: MAIN_CATEGORY_IDS.COMPUTER_OFFICE, slugPatterns: ["laptop", "computer"], priority: 10 }
  ],
  computer: [
    { mainCategoryId: MAIN_CATEGORY_IDS.COMPUTER_OFFICE, slugPatterns: ["computer", "laptop"], priority: 10 }
  ],
  tablet: [
    { mainCategoryId: MAIN_CATEGORY_IDS.COMPUTER_OFFICE, slugPatterns: ["tablet", "laptop"], priority: 10 }
  ],
  keyboard: [
    { mainCategoryId: MAIN_CATEGORY_IDS.COMPUTER_OFFICE, slugPatterns: ["accessory", "keyboard"], priority: 10 }
  ],
  mouse: [
    { mainCategoryId: MAIN_CATEGORY_IDS.COMPUTER_OFFICE, slugPatterns: ["accessory", "mouse"], priority: 10 }
  ],
  monitor: [
    { mainCategoryId: MAIN_CATEGORY_IDS.COMPUTER_OFFICE, slugPatterns: ["monitor", "display"], priority: 10 }
  ],
  printer: [
    { mainCategoryId: MAIN_CATEGORY_IDS.COMPUTER_OFFICE, slugPatterns: ["office", "printer"], priority: 10 }
  ],
  usb: [
    { mainCategoryId: MAIN_CATEGORY_IDS.COMPUTER_OFFICE, slugPatterns: ["storage", "usb"], priority: 8 }
  ],
  ssd: [
    { mainCategoryId: MAIN_CATEGORY_IDS.COMPUTER_OFFICE, slugPatterns: ["storage"], priority: 10 }
  ],
  network: [
    { mainCategoryId: MAIN_CATEGORY_IDS.COMPUTER_OFFICE, slugPatterns: ["network"], priority: 10 }
  ],
  router: [
    { mainCategoryId: MAIN_CATEGORY_IDS.COMPUTER_OFFICE, slugPatterns: ["network"], priority: 10 }
  ],
  
  car: [
    { mainCategoryId: MAIN_CATEGORY_IDS.AUTOMOBILES_MOTORCYCLES, slugPatterns: ["car", "auto"], priority: 10 }
  ],
  auto: [
    { mainCategoryId: MAIN_CATEGORY_IDS.AUTOMOBILES_MOTORCYCLES, slugPatterns: ["auto"], priority: 10 }
  ],
  automotive: [
    { mainCategoryId: MAIN_CATEGORY_IDS.AUTOMOBILES_MOTORCYCLES, slugPatterns: ["auto"], priority: 10 }
  ],
  motorcycle: [
    { mainCategoryId: MAIN_CATEGORY_IDS.AUTOMOBILES_MOTORCYCLES, slugPatterns: ["motorcycle"], priority: 10 }
  ],
  motorbike: [
    { mainCategoryId: MAIN_CATEGORY_IDS.AUTOMOBILES_MOTORCYCLES, slugPatterns: ["motorcycle"], priority: 10 }
  ],
  helmet: [
    { mainCategoryId: MAIN_CATEGORY_IDS.AUTOMOBILES_MOTORCYCLES, slugPatterns: ["motorcycle", "helmet"], priority: 8 },
    { mainCategoryId: MAIN_CATEGORY_IDS.SPORTS_OUTDOORS, slugPatterns: ["cycling", "helmet"], priority: 5 }
  ],
  tire: [
    { mainCategoryId: MAIN_CATEGORY_IDS.AUTOMOBILES_MOTORCYCLES, slugPatterns: ["replacement", "tire"], priority: 10 }
  ],
  
  tool: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_IMPROVEMENT, slugPatterns: ["tool"], priority: 10 }
  ],
  tools: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_IMPROVEMENT, slugPatterns: ["tool"], priority: 10 }
  ],
  drill: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_IMPROVEMENT, slugPatterns: ["tool", "power"], priority: 10 }
  ],
  hammer: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_IMPROVEMENT, slugPatterns: ["tool", "hand"], priority: 10 }
  ],
  screwdriver: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_IMPROVEMENT, slugPatterns: ["tool", "hand"], priority: 10 }
  ],
  appliance: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_IMPROVEMENT, slugPatterns: ["appliance", "home"], priority: 10 }
  ],
  appliances: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_IMPROVEMENT, slugPatterns: ["appliance", "home"], priority: 10 }
  ],
  
  scarf: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["scarf", "accessory"], priority: 8 }
  ],
  scarves: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["scarf", "accessory"], priority: 8 }
  ],
  hat: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["hat", "accessory"], priority: 5 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["hat", "cap"], priority: 5 }
  ],
  cap: [
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["hat", "cap"], priority: 8 }
  ],
  glove: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["glove", "accessory"], priority: 5 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["accessory"], priority: 5 }
  ],
  gloves: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["glove", "accessory"], priority: 5 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["accessory"], priority: 5 }
  ],
  belt: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["belt", "accessory"], priority: 5 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["accessory"], priority: 5 }
  ],
  sunglasses: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["sunglass", "accessory"], priority: 5 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["accessory"], priority: 5 }
  ],
  glasses: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["glass", "accessory"], priority: 5 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["accessory"], priority: 5 }
  ],
  
  wedding: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["wedding", "event", "party"], priority: 10 },
    { mainCategoryId: MAIN_CATEGORY_IDS.JEWELRY_WATCHES, slugPatterns: ["wedding", "engagement"], priority: 8 }
  ],
  party: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["party", "event", "wedding"], priority: 8 },
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["party", "festive"], priority: 5 }
  ],
  formal: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["formal", "event"], priority: 5 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["suit", "formal"], priority: 8 }
  ],
  casual: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["casual"], priority: 3 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["casual"], priority: 3 }
  ],
  
  legging: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["legging", "bottom", "sport"], priority: 10 }
  ],
  leggings: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["legging", "bottom", "sport"], priority: 10 }
  ],
  bodysuit: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["bodysuit", "body"], priority: 10 }
  ],
  tank: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["tank", "top", "cami"], priority: 8 }
  ],
  camisole: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["cami", "tank", "top"], priority: 10 }
  ],
  vest: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["vest", "outerwear"], priority: 5 },
    { mainCategoryId: MAIN_CATEGORY_IDS.MENS_CLOTHING, slugPatterns: ["vest"], priority: 5 }
  ],
  
  costume: [
    { mainCategoryId: MAIN_CATEGORY_IDS.WOMENS_CLOTHING, slugPatterns: ["costume"], priority: 8 },
    { mainCategoryId: MAIN_CATEGORY_IDS.TOYS_KIDS_BABIES, slugPatterns: ["costume", "dress"], priority: 5 }
  ],
  halloween: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["festive", "party"], priority: 8 },
    { mainCategoryId: MAIN_CATEGORY_IDS.TOYS_KIDS_BABIES, slugPatterns: ["costume"], priority: 5 }
  ],
  christmas: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["festive", "party"], priority: 10 }
  ],
  
  sewing: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["sewing", "craft", "art"], priority: 10 }
  ],
  craft: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["craft", "art", "sewing"], priority: 10 }
  ],
  crafts: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["craft", "art", "sewing"], priority: 10 }
  ],
  fabric: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["sewing", "fabric"], priority: 10 }
  ],
  thread: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["sewing"], priority: 10 }
  ],
  
  instrument: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["musical", "instrument"], priority: 10 }
  ],
  guitar: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["musical", "instrument"], priority: 10 }
  ],
  piano: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["musical", "instrument"], priority: 10 }
  ],
  violin: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["musical", "instrument"], priority: 10 }
  ],
  drum: [
    { mainCategoryId: MAIN_CATEGORY_IDS.HOME_GARDEN_FURNITURE, slugPatterns: ["musical", "instrument"], priority: 10 }
  ],
  
  security: [
    { mainCategoryId: MAIN_CATEGORY_IDS.COMPUTER_OFFICE, slugPatterns: ["security", "protection"], priority: 10 }
  ],
  cctv: [
    { mainCategoryId: MAIN_CATEGORY_IDS.COMPUTER_OFFICE, slugPatterns: ["security", "camera"], priority: 10 }
  ]
};

const GENDER_MAIN_CATEGORIES: Record<NonNullGender, number[]> = {
  women: [MAIN_CATEGORY_IDS.WOMENS_CLOTHING],
  men: [MAIN_CATEGORY_IDS.MENS_CLOTHING],
  kids: [MAIN_CATEGORY_IDS.TOYS_KIDS_BABIES],
  baby: [MAIN_CATEGORY_IDS.TOYS_KIDS_BABIES],
  unisex: []
};

const CROSS_CATEGORY_RULES: { condition: (keywords: string[], gender: GenderType) => boolean; addCategories: number[] }[] = [
  {
    condition: (keywords, gender) => 
      gender === "women" && (keywords.includes("shoe") || keywords.includes("shoes") || keywords.includes("sneaker") || keywords.includes("boot") || keywords.includes("sandal") || keywords.includes("heel")),
    addCategories: [MAIN_CATEGORY_IDS.WOMENS_CLOTHING, MAIN_CATEGORY_IDS.BAGS_SHOES]
  },
  {
    condition: (keywords, gender) => 
      gender === "men" && (keywords.includes("shoe") || keywords.includes("shoes") || keywords.includes("sneaker") || keywords.includes("boot") || keywords.includes("sandal")),
    addCategories: [MAIN_CATEGORY_IDS.MENS_CLOTHING, MAIN_CATEGORY_IDS.BAGS_SHOES]
  },
  {
    condition: (keywords, gender) => 
      gender === "women" && (keywords.includes("bag") || keywords.includes("handbag") || keywords.includes("purse") || keywords.includes("backpack")),
    addCategories: [MAIN_CATEGORY_IDS.WOMENS_CLOTHING, MAIN_CATEGORY_IDS.BAGS_SHOES]
  },
  {
    condition: (keywords, gender) => 
      gender === "men" && (keywords.includes("bag") || keywords.includes("backpack") || keywords.includes("wallet")),
    addCategories: [MAIN_CATEGORY_IDS.MENS_CLOTHING, MAIN_CATEGORY_IDS.BAGS_SHOES]
  },
  {
    condition: (keywords, gender) => 
      gender === "women" && (keywords.includes("sport") || keywords.includes("athletic") || keywords.includes("yoga") || keywords.includes("gym") || keywords.includes("fitness")),
    addCategories: [MAIN_CATEGORY_IDS.WOMENS_CLOTHING, MAIN_CATEGORY_IDS.SPORTS_OUTDOORS]
  },
  {
    condition: (keywords, gender) => 
      gender === "men" && (keywords.includes("sport") || keywords.includes("athletic") || keywords.includes("gym") || keywords.includes("fitness")),
    addCategories: [MAIN_CATEGORY_IDS.MENS_CLOTHING, MAIN_CATEGORY_IDS.SPORTS_OUTDOORS]
  },
  {
    condition: (keywords, gender) => 
      keywords.includes("kids") || keywords.includes("child") || keywords.includes("children") || keywords.includes("boy") || keywords.includes("girl"),
    addCategories: [MAIN_CATEGORY_IDS.TOYS_KIDS_BABIES]
  },
  {
    condition: (keywords, gender) => 
      gender === "women" && (keywords.includes("watch") || keywords.includes("jewelry") || keywords.includes("necklace") || keywords.includes("bracelet") || keywords.includes("earring")),
    addCategories: [MAIN_CATEGORY_IDS.WOMENS_CLOTHING, MAIN_CATEGORY_IDS.JEWELRY_WATCHES]
  },
  {
    condition: (keywords, gender) => 
      gender === "men" && (keywords.includes("watch")),
    addCategories: [MAIN_CATEGORY_IDS.MENS_CLOTHING, MAIN_CATEGORY_IDS.JEWELRY_WATCHES]
  }
];

export function detectGender(text: string): GenderType {
  const lowerText = text.toLowerCase();
  
  for (const [gender, keywords] of Object.entries(GENDER_KEYWORDS)) {
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:'s)?\\b`, 'i');
      if (regex.test(lowerText)) {
        return gender as GenderType;
      }
    }
  }
  
  return null;
}

export function extractKeywords(text: string): string[] {
  const lowerText = text.toLowerCase();
  
  const cleaned = lowerText
    .replace(/['']/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const words = cleaned.split(/[\s\-_]+/);
  
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'up', 'about', 'into', 'over', 'after', 'new', 'hot', 'sale', 'free',
    'shipping', 'style', 'fashion', 'high', 'quality', 'best', 'top', 'good', 'great',
    'size', 'color', 'colours', 'colors', 'piece', 'pieces', 'set', 'sets', 'pack',
    'pcs', 'lot', 'item', 'items', 'product', 'products', 'wholesale', 'retail', 'drop',
    '2024', '2025', 'latest', 'newest', 'brand', 'branded', 'plus', 'mini', 'maxi'
  ]);
  
  const keywords: string[] = [];
  
  for (const word of words) {
    if (word.length >= 3 && !stopWords.has(word) && !/^\d+$/.test(word)) {
      keywords.push(word);
    }
  }
  
  return [...new Set(keywords)];
}

export async function getAllParentCategories(admin: any, categoryId: number): Promise<number[]> {
  const parents: number[] = [];
  let currentId = categoryId;
  
  for (let i = 0; i < 5; i++) {
    const { data: cat } = await admin
      .from('categories')
      .select('id, parent_id')
      .eq('id', currentId)
      .maybeSingle();
    
    if (!cat || !cat.parent_id) break;
    
    parents.push(cat.parent_id);
    currentId = cat.parent_id;
  }
  
  return parents;
}

export async function findCategoriesBySlugPatterns(
  admin: any, 
  mainCategoryId: number, 
  slugPatterns: string[]
): Promise<Array<{ id: number; name: string; slug: string; level: number }>> {
  const results: Array<{ id: number; name: string; slug: string; level: number }> = [];
  
  const { data: mainCat } = await admin
    .from('categories')
    .select('id, name, slug, level')
    .eq('id', mainCategoryId)
    .maybeSingle();
  
  if (mainCat) {
    results.push(mainCat);
  }
  
  for (const pattern of slugPatterns) {
    const { data: matches } = await admin
      .from('categories')
      .select('id, name, slug, level, parent_id')
      .ilike('slug', `%${pattern}%`)
      .order('level', { ascending: false })
      .limit(5);
    
    if (matches) {
      for (const match of matches) {
        let belongsToMain = match.id === mainCategoryId;
        
        if (!belongsToMain) {
          const parents = await getAllParentCategories(admin, match.id);
          belongsToMain = parents.includes(mainCategoryId);
        }
        
        if (belongsToMain && !results.find(r => r.id === match.id)) {
          results.push({ id: match.id, name: match.name, slug: match.slug, level: match.level });
        }
      }
    }
  }
  
  return results;
}

export async function analyzeProduct(
  productName: string,
  productDescription: string = "",
  existingCategoryName: string = ""
): Promise<IntelligenceResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      detectedGender: null,
      extractedKeywords: [],
      matchedCategories: [],
      primaryCategoryId: null
    };
  }
  
  const fullText = `${productName} ${productDescription} ${existingCategoryName}`;
  
  const detectedGender = detectGender(fullText);
  const extractedKeywords = extractKeywords(fullText);
  
  const matchedCategories: CategoryMatch[] = [];
  const seenCategoryIds = new Set<number>();
  
  let primaryCategoryId: number | null = null;
  let highestPriority = 0;
  
  for (const keyword of extractedKeywords) {
    const mappings = KEYWORD_CATEGORY_MAP[keyword];
    if (!mappings) continue;
    
    for (const mapping of mappings) {
      const categories = await findCategoriesBySlugPatterns(admin, mapping.mainCategoryId, mapping.slugPatterns);
      
      for (const cat of categories) {
        if (seenCategoryIds.has(cat.id)) continue;
        seenCategoryIds.add(cat.id);
        
        const isPrimary = cat.level === 3 && mapping.priority > highestPriority;
        if (isPrimary) {
          highestPriority = mapping.priority;
          primaryCategoryId = cat.id;
        }
        
        matchedCategories.push({
          categoryId: cat.id,
          categoryName: cat.name,
          categorySlug: cat.slug,
          matchType: isPrimary ? "primary" : "keyword",
          confidence: mapping.priority / 10
        });
      }
    }
  }
  
  if (detectedGender) {
    const genderMainCats = GENDER_MAIN_CATEGORIES[detectedGender] || [];
    for (const mainCatId of genderMainCats) {
      if (!seenCategoryIds.has(mainCatId)) {
        seenCategoryIds.add(mainCatId);
        
        const { data: cat } = await admin
          .from('categories')
          .select('id, name, slug')
          .eq('id', mainCatId)
          .maybeSingle();
        
        if (cat) {
          matchedCategories.push({
            categoryId: cat.id,
            categoryName: cat.name,
            categorySlug: cat.slug,
            matchType: "gender",
            confidence: 0.9
          });
        }
      }
    }
  }
  
  for (const rule of CROSS_CATEGORY_RULES) {
    if (rule.condition(extractedKeywords, detectedGender)) {
      for (const catId of rule.addCategories) {
        if (!seenCategoryIds.has(catId)) {
          seenCategoryIds.add(catId);
          
          const { data: cat } = await admin
            .from('categories')
            .select('id, name, slug')
            .eq('id', catId)
            .maybeSingle();
          
          if (cat) {
            matchedCategories.push({
              categoryId: cat.id,
              categoryName: cat.name,
              categorySlug: cat.slug,
              matchType: "cross-category",
              confidence: 0.8
            });
          }
        }
      }
    }
  }
  
  const level3Categories = matchedCategories.filter(c => {
    return c.matchType === "primary" || c.matchType === "keyword";
  });
  
  for (const cat of level3Categories) {
    const parents = await getAllParentCategories(admin, cat.categoryId);
    for (const parentId of parents) {
      if (!seenCategoryIds.has(parentId)) {
        seenCategoryIds.add(parentId);
        
        const { data: parentCat } = await admin
          .from('categories')
          .select('id, name, slug')
          .eq('id', parentId)
          .maybeSingle();
        
        if (parentCat) {
          matchedCategories.push({
            categoryId: parentCat.id,
            categoryName: parentCat.name,
            categorySlug: parentCat.slug,
            matchType: "parent",
            confidence: 0.95
          });
        }
      }
    }
  }
  
  return {
    detectedGender,
    extractedKeywords,
    matchedCategories,
    primaryCategoryId
  };
}

export async function linkProductToMultipleCategories(
  admin: any,
  productId: number,
  productName: string,
  productDescription: string = "",
  existingCategoryName: string = ""
): Promise<{ success: boolean; categoriesLinked: number; details: CategoryMatch[] }> {
  try {
    const analysis = await analyzeProduct(productName, productDescription, existingCategoryName);
    
    if (analysis.matchedCategories.length === 0) {
      return { success: false, categoriesLinked: 0, details: [] };
    }
    
    await admin.from('product_categories').delete().eq('product_id', productId);
    
    let insertedCount = 0;
    
    const sortedCategories = [...analysis.matchedCategories].sort((a, b) => {
      if (a.categoryId === analysis.primaryCategoryId) return -1;
      if (b.categoryId === analysis.primaryCategoryId) return 1;
      return b.confidence - a.confidence;
    });
    
    for (const cat of sortedCategories) {
      try {
        const isPrimary = cat.categoryId === analysis.primaryCategoryId;
        
        await admin.from('product_categories').insert({
          product_id: productId,
          category_id: cat.categoryId,
          is_primary: isPrimary
        });
        
        insertedCount++;
      } catch (e: any) {
        if (!/duplicate|already exists|unique/i.test(e?.message || '')) {
          console.error(`[Intelligence] Failed to insert category ${cat.categoryId}:`, e?.message);
        }
      }
    }
    
    return {
      success: insertedCount > 0,
      categoriesLinked: insertedCount,
      details: sortedCategories
    };
  } catch (e: any) {
    console.error('[Intelligence] Error in linkProductToMultipleCategories:', e?.message);
    return { success: false, categoriesLinked: 0, details: [] };
  }
}
