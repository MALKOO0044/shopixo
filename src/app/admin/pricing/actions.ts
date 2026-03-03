"use server";

import { calculateRetailSar, recommendPackaging } from '@/lib/pricing';

export type LandedCostInput = {
  supplierCostSar: number;
  actualKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  margin?: number;       // default 0.35
  handlingSar?: number;  // default 0
};

export async function calculateLandedCost(input: LandedCostInput) {
  const { supplierCostSar, actualKg, lengthCm, widthCm, heightCm, margin, handlingSar } = input;
  if (!(supplierCostSar >= 0)) throw new Error('supplierCostSar must be >= 0');
  if (!(actualKg > 0)) throw new Error('actualKg must be > 0');
  if (!(lengthCm > 0 && widthCm > 0 && heightCm > 0)) throw new Error('invalid dimensions');

  const calc = calculateRetailSar(supplierCostSar, { actualKg, lengthCm, widthCm, heightCm }, { margin, handlingSar });
  const pack = recommendPackaging(actualKg, { L: lengthCm, W: widthCm, H: heightCm });
  return { ...calc, packaging: pack };
}
