import { normalizeDisplayedRating } from "@/lib/rating/engine";

const MIN_SYNTHETIC_REVIEW_COUNT = 20;
const MAX_SYNTHETIC_REVIEW_COUNT = 400;
const MIN_SYNTHETIC_RATING = 3.3;
const MAX_SYNTHETIC_RATING = 4.9;

const FLASHBACK_PREFIXES = [
  "Looks exactly like the photos",
  "Quality is better than expected",
  "Fast delivery and great packaging",
  "Color and finish are very clean",
  "Comfort is excellent for daily use",
  "Good value for the price",
  "Material feels durable",
  "Sizing details were accurate",
  "Works as described",
  "I would buy this again",
];

const FLASHBACK_SUFFIXES = [
  "No personal details shared.",
  "Reviewer identity kept private.",
  "Anonymous feedback only.",
  "Shared without personal info.",
  "Posted with protected identity.",
  "Customer name hidden for privacy.",
];

export type SyntheticReviewProfile = {
  reviewCount: number;
  rating: number;
  displayedRating: number;
  ratingConfidence: number;
};

export type SyntheticFlashbackReview = {
  id: number;
  author: string;
  dateIso: string;
  rating: number;
  content: string;
  helpful: number;
  isFlashback: true;
  privacyNote: string;
};

function normalizeSeedInput(value: unknown): string {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized || "shopixo-default";
}

function hashSeed(value: string): number {
  // FNV-1a 32-bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function createPrng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomIntInclusive(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function buildSyntheticReviewProfile(seedInput: unknown): SyntheticReviewProfile {
  const seedValue = normalizeSeedInput(seedInput);
  const rand = createPrng(hashSeed(`profile:${seedValue}`));

  const reviewCount = randomIntInclusive(rand, MIN_SYNTHETIC_REVIEW_COUNT, MAX_SYNTHETIC_REVIEW_COUNT);
  const rawRating = MIN_SYNTHETIC_RATING + rand() * (MAX_SYNTHETIC_RATING - MIN_SYNTHETIC_RATING);
  const rating = normalizeDisplayedRating(rawRating);
  const ratingConfidence = Number(
    clamp(0.68 + Math.log10(reviewCount + 1) / 4, 0.68, 1).toFixed(2)
  );

  return {
    reviewCount,
    rating,
    displayedRating: rating,
    ratingConfidence,
  };
}

export function buildSyntheticFlashbackReviews(
  seedInput: unknown,
  totalReviews: number,
  maxEntries: number = 4
): SyntheticFlashbackReview[] {
  if (!Number.isFinite(totalReviews) || totalReviews <= 10) {
    return [];
  }

  const safeEntries = Math.max(2, Math.min(6, Math.floor(maxEntries)));
  const seedValue = normalizeSeedInput(seedInput);
  const baseProfile = buildSyntheticReviewProfile(seedValue);
  const rand = createPrng(hashSeed(`flashback:${seedValue}`));
  const now = Date.now();

  const reviews: SyntheticFlashbackReview[] = [];
  for (let i = 0; i < safeEntries; i++) {
    const prefix = FLASHBACK_PREFIXES[randomIntInclusive(rand, 0, FLASHBACK_PREFIXES.length - 1)];
    const suffix = FLASHBACK_SUFFIXES[randomIntInclusive(rand, 0, FLASHBACK_SUFFIXES.length - 1)];
    const daysAgo = randomIntInclusive(rand, 3, 220);
    const dateIso = new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    const rating = normalizeDisplayedRating(
      clamp(baseProfile.rating + (rand() - 0.5) * 0.8, 3.0, 5.0)
    );

    reviews.push({
      id: -1 * (i + 1),
      author: `Verified buyer #${randomIntInclusive(rand, 1000, 9999)}`,
      dateIso,
      rating,
      content: `${prefix}. ${suffix}`,
      helpful: randomIntInclusive(rand, 1, 60),
      isFlashback: true,
      privacyNote: "Identity protected",
    });
  }

  return reviews;
}
