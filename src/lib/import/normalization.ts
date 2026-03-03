const SIZE_DISPLAY_ORDER = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
  "4XL",
  "5XL",
  "6XL",
  "ONE SIZE",
  "FREE SIZE",
] as const;

const CANONICAL_SIZE_SET = new Set<string>(SIZE_DISPLAY_ORDER);

const SIZE_SYNONYM_SOURCE: Array<[string, string]> = [
  ["XS", "XS"],
  ["EXTRA SMALL", "XS"],
  ["X SMALL", "XS"],
  ["XSMALL", "XS"],
  ["SMALL", "S"],
  ["S", "S"],
  ["MEDIUM", "M"],
  ["M", "M"],
  ["LARGE", "L"],
  ["L", "L"],
  ["XL", "XL"],
  ["X LARGE", "XL"],
  ["X-LARGE", "XL"],
  ["XLARGE", "XL"],
  ["EXTRA LARGE", "XL"],
  ["XXL", "XXL"],
  ["2XL", "XXL"],
  ["2X", "XXL"],
  ["XX LARGE", "XXL"],
  ["XX-LARGE", "XXL"],
  ["XXXL", "XXXL"],
  ["3XL", "XXXL"],
  ["3X", "XXXL"],
  ["XXX LARGE", "XXXL"],
  ["XXX-LARGE", "XXXL"],
  ["4XL", "4XL"],
  ["4X", "4XL"],
  ["5XL", "5XL"],
  ["5X", "5XL"],
  ["6XL", "6XL"],
  ["6X", "6XL"],
  ["ONE SIZE", "ONE SIZE"],
  ["ONESIZE", "ONE SIZE"],
  ["OS", "ONE SIZE"],
  ["FREE SIZE", "FREE SIZE"],
  ["FREESIZE", "FREE SIZE"],
  ["FS", "FREE SIZE"],
];

const SIZE_SYNONYMS = new Map<string, string>(
  SIZE_SYNONYM_SOURCE.map(([rawKey, canonical]) => [normalizeSizeLookupKey(rawKey), canonical])
);

function normalizeSizeLookupKey(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u4e00-\u9fff]/g, " ")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .trim();
}

export function normalizeCjProductId(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function canonicalizeSizeToken(value: unknown): string | null {
  const key = normalizeSizeLookupKey(value);
  if (!key) return null;

  const mapped = SIZE_SYNONYMS.get(key);
  if (mapped && CANONICAL_SIZE_SET.has(mapped)) {
    return mapped;
  }

  return null;
}

export function extractCanonicalSize(value: unknown): string | null {
  const direct = canonicalizeSizeToken(value);
  if (direct) return direct;

  const raw = String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u4e00-\u9fff]/g, " ")
    .toUpperCase();

  const parts = raw
    .split(/[\s\-_/|,;:]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  for (let i = parts.length - 1; i >= 0; i--) {
    const canonical = canonicalizeSizeToken(parts[i]);
    if (canonical) return canonical;
  }

  const trailingMatch = raw.match(/(ONE\s*SIZE|FREE\s*SIZE|[2-6]\s*X?L|XXXL|XXL|XL|XS|S|M|L)\s*$/i);
  if (trailingMatch?.[1]) {
    return canonicalizeSizeToken(trailingMatch[1]);
  }

  return null;
}

export function normalizeSizeList(values: unknown[]): string[] {
  const unique = new Set<string>();
  for (const value of values) {
    const canonical = extractCanonicalSize(value);
    if (canonical) unique.add(canonical);
  }

  const orderIndex = new Map<string, number>(SIZE_DISPLAY_ORDER.map((size, index) => [size, index]));
  return [...unique].sort((a, b) => {
    const aOrder = orderIndex.get(a) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = orderIndex.get(b) ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.localeCompare(b);
  });
}

export function dedupeLabelsCaseInsensitive(values: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const value of values) {
    const clean = String(value ?? "").trim();
    if (!clean) continue;

    const key = clean.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    deduped.push(clean);
  }

  return deduped;
}
