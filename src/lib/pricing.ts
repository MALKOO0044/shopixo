import { DEFAULT_KSA_DDP_MATRIX, type DdpTier } from '@/lib/shipping/ksa-ddp-matrix';

export type BilledWeightInput = {
  actualKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  divisor?: number; // defaults to env KSA_DDP_DIVISOR or 6000
};

export type RetailCalcOptions = {
  handlingSar?: number; // default 0
  margin?: number;      // fraction, e.g. 0.35
  roundTo?: number;     // nearest price rounding granularity, e.g. 0.05; default 0.05
  prettyEnding?: number[]; // prefer endings like .95 or .99
};

export type RetailCalcResult = {
  billedWeightKg: number;
  ddpShippingSar: number;
  landedCostSar: number;
  retailSar: number;
};

export function getDivisor(): number {
  const fromEnv = Number(process.env.KSA_DDP_DIVISOR || '6000');
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 6000;
}

export function getKsaDdpMatrix(): DdpTier[] {
  try {
    const raw = process.env.KSA_DDP_MATRIX_JSON;
    if (raw) {
      const parsed = JSON.parse(raw) as DdpTier[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_KSA_DDP_MATRIX;
}

export function computeVolumetricWeightKg(input: BilledWeightInput): number {
  const divisor = input.divisor ?? getDivisor();
  const vol = (input.lengthCm * input.widthCm * input.heightCm) / divisor;
  return Number(vol.toFixed(3));
}

export function computeBilledWeightKg(input: BilledWeightInput): number {
  const vol = computeVolumetricWeightKg(input);
  const billed = Math.max(input.actualKg, vol);
  return Number(billed.toFixed(3));
}

export function resolveDdpShippingSar(billedWeightKg: number, matrix: DdpTier[] = getKsaDdpMatrix()): number {
  // Find first tier that covers billed weight
  for (const t of matrix) {
    if (billedWeightKg <= t.maxKg + 1e-9) return t.priceSAR;
  }
  // If above highest tier, extrapolate linearly using the last step's per-kg increment (rough fallback)
  const last = matrix[matrix.length - 1];
  const prev = matrix[matrix.length - 2] || { maxKg: 0, priceSAR: 0 };
  const perKg = (last.priceSAR - prev.priceSAR) / Math.max(last.maxKg - prev.maxKg, 1);
  const extraKg = Math.max(0, billedWeightKg - last.maxKg);
  return Math.round((last.priceSAR + perKg * extraKg) * 100) / 100;
}

function roundToGranularity(value: number, step = 0.05): number {
  const rounded = Math.round(value / step) * step;
  return Math.round(rounded * 100) / 100;
}

function prettyPrice(value: number, endings: number[] = [0.95, 0.99]): number {
  const floor = Math.floor(value);
  const decimals = value - floor;
  let best = value;
  let bestDiff = Infinity;
  for (const e of endings) {
    const candidate = floor + e;
    const diff = Math.abs(candidate - value);
    if (diff < bestDiff) {
      best = candidate;
      bestDiff = diff;
    }
  }
  return Math.round(best * 100) / 100;
}

export function computeRetailFromLanded(
  landedCostSar: number,
  opts: RetailCalcOptions = {}
): number {
  const margin = opts.margin ?? 0.35;
  const step = opts.roundTo ?? 0.05;
  const prelim = landedCostSar / Math.max(1e-6, (1 - margin));
  const rounded = roundToGranularity(prelim, step);
  return prettyPrice(rounded, opts.prettyEnding ?? [0.95, 0.99]);
}

export function calculateRetailSar(
  supplierCostSar: number,
  weight: BilledWeightInput,
  opts: RetailCalcOptions = {}
): RetailCalcResult {
  const handling = opts.handlingSar ?? 0;
  const billed = computeBilledWeightKg(weight);
  const ddp = resolveDdpShippingSar(billed);
  const landed = supplierCostSar + ddp + handling;
  const retail = computeRetailFromLanded(landed, opts);
  return {
    billedWeightKg: billed,
    ddpShippingSar: ddp,
    landedCostSar: Math.round(landed * 100) / 100,
    retailSar: retail,
  };
}

export function usdToSar(usd: number): number {
  const rate = Number(process.env.EXCHANGE_USD_TO_SAR || '3.75');
  return Math.round(usd * rate * 100) / 100;
}

// --- Packaging recommendation ---
export type PackagingOption = {
  code: 'POLY_MAILER' | 'PADDED_BAG' | 'SMALL_BOX';
  innerDimsCm: { L: number; W: number; H: number };
  description: string;
};

const PACKAGING_OPTIONS: PackagingOption[] = [
  { code: 'POLY_MAILER', innerDimsCm: { L: 25, W: 20, H: 3 }, description: 'Tight fold apparel; neutral poly mailer' },
  { code: 'PADDED_BAG', innerDimsCm: { L: 30, W: 25, H: 6 }, description: 'Padded bag (no shoe box) for light footwear' },
  { code: 'SMALL_BOX', innerDimsCm: { L: 33, W: 22, H: 12 }, description: 'Small carton box for accessories/shoes' },
];

export function recommendPackaging(actualKg: number, productDimsCm: { L: number; W: number; H: number }, divisor?: number) {
  const d = divisor ?? getDivisor();
  let best = PACKAGING_OPTIONS[0];
  let bestBilled = Infinity;
  for (const opt of PACKAGING_OPTIONS) {
    const L = Math.max(opt.innerDimsCm.L, productDimsCm.L);
    const W = Math.max(opt.innerDimsCm.W, productDimsCm.W);
    const H = Math.max(opt.innerDimsCm.H, productDimsCm.H);
    const vol = (L * W * H) / d;
    const billed = Math.max(actualKg, vol);
    if (billed < bestBilled) {
      bestBilled = billed;
      best = opt;
    }
  }
  return { option: best, billedWeightKg: Number(bestBilled.toFixed(3)) };
}

// --- Anomaly detection ---
export type PricingAnomaly = { code: string; severity: 'info' | 'warn' | 'error'; message: string };

export function detectPricingAnomalies(input: {
  actualKg: number;
  volumetricKg: number;
  billedKg: number;
  ddpShippingSar: number;
  landedCostSar: number;
  retailSar: number;
}): PricingAnomaly[] {
  const out: PricingAnomaly[] = [];
  const { actualKg, volumetricKg, billedKg, ddpShippingSar, landedCostSar, retailSar } = input;
  const volRatio = volumetricKg > 0 && actualKg > 0 ? volumetricKg / actualKg : 0;
  if (volRatio >= 3) {
    out.push({ code: 'VOL>>ACTUAL', severity: 'warn', message: `Volumetric weight (${volumetricKg.toFixed(2)}kg) is ${volRatio.toFixed(1)}x actual (${actualKg.toFixed(2)}kg)` });
  }
  // Heuristic thresholds; adjust when real KSA DDP matrix is finalized
  const ddpPerKg = billedKg > 0 ? ddpShippingSar / billedKg : 0;
  if (ddpPerKg > 90) {
    out.push({ code: 'HIGH_DDP_PER_KG', severity: 'warn', message: `DDP shipping SAR/kg seems high: ${ddpPerKg.toFixed(2)} SAR/kg` });
  }
  if (retailSar < landedCostSar * 1.05) {
    out.push({ code: 'LOW_MARGIN', severity: 'warn', message: `Retail (${retailSar}) is too close to landed (${landedCostSar}); margin may be too low.` });
  }
  if (ddpShippingSar > retailSar * 0.6) {
    out.push({ code: 'SHIP>RETAIL*0.6', severity: 'info', message: `Shipping (${ddpShippingSar}) is a large fraction of retail (${retailSar}).` });
  }
  if (billedKg > 5) {
    out.push({ code: 'HEAVY_PARCEL', severity: 'info', message: `Billed weight is heavy (${billedKg.toFixed(2)}kg); verify service level & matrix tiers.` });
  }
  return out;
}
