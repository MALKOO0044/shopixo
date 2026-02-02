export type RatingSignals = {
  imageCount?: number;
  stock?: number | null;
  variantCount?: number;
  qualityScore?: number;
  priceUsd?: number;
  sentiment?: number; // -1..1
  orderVolume?: number; // recent orders, if available
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalize(n: number | null | undefined, min: number, max: number): number {
  if (n == null || !Number.isFinite(n)) return 0;
  if (max === min) return 0;
  const v = (n - min) / (max - min);
  return clamp(v, 0, 1);
}

export function computeRating(signals: RatingSignals): { displayedRating: number; ratingConfidence: number; signals: Required<Record<string, number>> } {
  const imgScore = normalize(signals.imageCount ?? 0, 0, 15); // 0..15+ images
  const stockScore = normalize(signals.stock ?? 0, 0, 500); // 0..500+ stock
  const variantScore = normalize(signals.variantCount ?? 0, 0, 20); // 0..20+ variants
  const qualityScore = clamp(signals.qualityScore ?? 0, 0, 1); // already 0..1 if provided
  const priceScore = 1 - normalize(signals.priceUsd ?? 0, 0, 50); // cheaper is better
  const sentimentScore = clamp(((signals.sentiment ?? 0) + 1) / 2, 0, 1); // -1..1 -> 0..1
  const orderScore = normalize(signals.orderVolume ?? 0, 0, 200); // 0..200+ orders

  // Weights sum to 1
  const w = {
    img: 0.12,
    stock: 0.18,
    variant: 0.1,
    quality: 0.3,
    price: 0.15,
    sentiment: 0.05,
    orders: 0.1,
  };

  const composite =
    imgScore * w.img +
    stockScore * w.stock +
    variantScore * w.variant +
    qualityScore * w.quality +
    priceScore * w.price +
    sentimentScore * w.sentiment +
    orderScore * w.orders;

  const displayed = clamp(+(composite * 5).toFixed(1), 0, 5);

  const presentSignals = [
    signals.imageCount,
    signals.stock,
    signals.variantCount,
    signals.qualityScore,
    signals.priceUsd,
    signals.sentiment,
    signals.orderVolume,
  ].filter((v) => v !== undefined && v !== null).length;
  const ratingConfidence = clamp(+(presentSignals / 7).toFixed(2), 0.05, 1);

  return {
    displayedRating: displayed,
    ratingConfidence,
    signals: {
      imageCount: signals.imageCount ?? 0,
      stock: signals.stock ?? 0,
      variantCount: signals.variantCount ?? 0,
      qualityScore: signals.qualityScore ?? 0,
      priceUsd: signals.priceUsd ?? 0,
      sentiment: signals.sentiment ?? 0,
      orderVolume: signals.orderVolume ?? 0,
    },
  };
}

export function getConfidenceLabel(conf: number | null | undefined): 'low' | 'medium' | 'high' {
  const c = typeof conf === 'number' ? conf : 0;
  if (c >= 0.75) return 'high';
  if (c >= 0.4) return 'medium';
  return 'low';
}
