export type RatingSignals = {
  productId?: number | null;
  cjPid?: string | null;
  supplierStarRaw?: number | null; // 0..5 if available
  sentimentScore?: number | null; // -1..1 or 0..1 depending on source (we normalize internally)
  orderVolume?: number | null; // e.g., listedNum from CJ
  recencyScore?: number | null; // 0..1 where 1 = very recent
  imageCount?: number | null; // integer
  priceScore?: number | null; // 0..1 where 1 = very competitive
  qualityPenalty?: number | null; // 0..1 severity (mapped to 3-5% penalty)
};

export type RatingResult = {
  displayedRating: number; // 0..5 (one decimal)
  confidence: number; // 0..1
  breakdown: Record<string, number>;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// Normalize helpers: map various inputs into 0..5 signal scale
function normalizeSupplierStar(v?: number | null): number | null {
  if (v == null || !isFinite(v)) return null;
  return clamp(v, 0, 5);
}

function normalizeSentiment(s?: number | null): number | null {
  if (s == null || !isFinite(s)) return null;
  // Accept -1..1 or 0..1
  const z = s >= 0 && s <= 1 ? s : (s + 1) / 2; // map -1..1 to 0..1
  return clamp(z * 5, 0, 5);
}

function normalizeOrderVolume(v?: number | null): number | null {
  if (v == null || !isFinite(v) || v < 0) return null;
  // Log scale: 0..10000 -> 0..5
  const score = Math.log10(1 + v) / Math.log10(1 + 10000) * 5;
  return clamp(score, 0, 5);
}

function normalizeRecency(r?: number | null): number | null {
  if (r == null || !isFinite(r)) return null;
  // Assume 0..1 where 1 is most recent
  return clamp(r * 5, 0, 5);
}

function normalizeImageCount(n?: number | null): number | null {
  if (n == null || !isFinite(n) || n <= 0) return null;
  // 0..30+ -> 0..5 (cap at 30 images)
  const score = Math.min(n, 30) / 30 * 5;
  return clamp(score, 0, 5);
}

function normalizePriceScore(p?: number | null): number | null {
  if (p == null || !isFinite(p)) return null;
  // Expect 0..1 where 1 is very competitive
  return clamp(p * 5, 0, 5);
}

export function computeRating(signals: RatingSignals): RatingResult {
  // Weights (sum = 77 after removing review count)
  const W = {
    supplier: 40,
    sentiment: 12,
    volume: 8,
    recency: 8,
    images: 5,
    price: 4,
  } as const;
  const totalWeight = W.supplier + W.sentiment + W.volume + W.recency + W.images + W.price; // 77

  const supplier = normalizeSupplierStar(signals.supplierStarRaw);
  const sentiment = normalizeSentiment(signals.sentimentScore);
  const volume = normalizeOrderVolume(signals.orderVolume);
  const recency = normalizeRecency(signals.recencyScore);
  const images = normalizeImageCount(signals.imageCount);
  const price = normalizePriceScore(signals.priceScore);

  const contributions: Array<[number, number, string]> = [];
  if (supplier != null) contributions.push([supplier, W.supplier, 'supplier']);
  if (sentiment != null) contributions.push([sentiment, W.sentiment, 'sentiment']);
  if (volume != null) contributions.push([volume, W.volume, 'volume']);
  if (recency != null) contributions.push([recency, W.recency, 'recency']);
  if (images != null) contributions.push([images, W.images, 'images']);
  if (price != null) contributions.push([price, W.price, 'price']);

  // If no signals, fall back to neutral baseline (low confidence)
  if (contributions.length === 0) {
    return { displayedRating: 4.0, confidence: 0.2, breakdown: {} };
  }

  const usedWeight = contributions.reduce((acc, [, w]) => acc + w, 0);
  const weighted = contributions.reduce((acc, [val, w]) => acc + val * w, 0) / usedWeight; // 0..5

  // Apply penalty: 3–5% based on severity (0..1)
  const sev = clamp((signals.qualityPenalty ?? 0) || 0, 0, 1);
  const penaltyPct = 0.03 + 0.02 * sev; // 3%..5%
  const penalized = weighted * (1 - penaltyPct);

  const displayed = clamp(Math.round(penalized * 10) / 10, 0, 5);

  // Confidence: proportion of weight present, adjusted by volume and reviews
  let confidence = usedWeight / totalWeight; // 0..1
  const volumeBoost = volume != null ? clamp(volume / 5, 0, 1) * 0.2 : 0; // up to +0.2
  confidence = clamp(confidence + volumeBoost, 0, 1);

  const breakdown: Record<string, number> = {};
  for (const [val, , key] of contributions) breakdown[key] = val;

  return {
    displayedRating: displayed,
    confidence,
    breakdown,
  };
}

export function confidenceLabel(confidence: number): 'Low' | 'Medium' | 'High' {
  if (confidence >= 0.75) return 'High';
  if (confidence >= 0.45) return 'Medium';
  return 'Low';
}
