export type StoreCategory = "Women" | "Men" | "Kids" | "Shoes" | "Accessories" | "Home" | "General";

const KEYWORDS: Record<StoreCategory, string[]> = {
  Women: ["women", "woman", "ladies", "girl", "female", "abaya", "hijab", "dress", "skirt", "blouse", "heels"],
  Men: ["men", "man", "male", "shirt", "pants", "hoodie", "jacket", "sweatshirt", "trousers"],
  Kids: ["kid", "child", "children", "boys", "girls", "toddler", "baby", "infant"],
  Shoes: ["shoe", "sneaker", "boot", "heel", "sandals", "loafers", "slippers", "flip flops"],
  Accessories: ["bag", "belt", "hat", "cap", "scarf", "gloves", "sunglasses", "watch", "jewelry"],
  Home: ["home", "kitchen", "bath", "bedding", "towel", "decor", "pillow", "blanket"],
  General: [],
};

function score(text: string, keywords: string[]): number {
  const t = text.toLowerCase();
  let s = 0;
  for (const k of keywords) {
    if (!k) continue;
    const re = new RegExp(`\\b${k.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
    if (re.test(t)) s += 1;
  }
  return s;
}

export function mapCategory(input: { cjCategory?: string; title?: string; description?: string }): { category: StoreCategory; confidence: number } {
  const base = `${input.cjCategory || ''} ${input.title || ''} ${input.description || ''}`.trim();
  if (!base) return { category: "General", confidence: 0 };
  let best: StoreCategory = "General";
  let bestScore = 0;
  (Object.keys(KEYWORDS) as StoreCategory[]).forEach((cat) => {
    if (cat === 'General') return;
    const s = score(base, KEYWORDS[cat]);
    if (s > bestScore) {
      best = cat;
      bestScore = s;
    }
  });
  const confidence = Math.min(1, bestScore / 3);
  return { category: bestScore > 0 ? best : "General", confidence };
}
