export type DdpTier = {
  maxKg: number;      // inclusive upper bound of the weight tier (kg)
  priceSAR: number;   // all-in DDP price in SAR for a parcel within this tier
};

// NOTE: These are placeholder defaults and MUST be overridden with your real KSA DDP matrix
// from the carrier/CJ. You can override at runtime via KSA_DDP_MATRIX_JSON or replace this file.
export const DEFAULT_KSA_DDP_MATRIX: DdpTier[] = [
  { maxKg: 0.5, priceSAR: 25 },
  { maxKg: 1.0, priceSAR: 35 },
  { maxKg: 1.5, priceSAR: 45 },
  { maxKg: 2.0, priceSAR: 55 },
  { maxKg: 3.0, priceSAR: 75 },
  { maxKg: 5.0, priceSAR: 110 },
];
