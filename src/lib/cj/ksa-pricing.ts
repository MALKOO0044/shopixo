const VAT_RATE = 0.15;
const PAYMENT_FEE_RATE = 0.029;
const DEFAULT_USD_TO_SAR_RATE = 3.75;

function getUsdToSarRate(): number {
  const envRate = process.env.USD_TO_SAR_RATE;
  if (envRate) {
    const rate = parseFloat(envRate);
    if (!isNaN(rate) && rate > 0) return rate;
  }
  return DEFAULT_USD_TO_SAR_RATE;
}

const SMART_ROUND_VALUES = [
  19, 29, 39, 49, 59, 69, 79, 89, 99,
  109, 119, 129, 139, 149, 159, 169, 179, 189, 199,
  219, 229, 249, 269, 279, 299,
  319, 349, 379, 399,
  449, 499, 549, 599, 649, 699, 749, 799, 849, 899, 949, 999,
  1099, 1199, 1299, 1399, 1499, 1699, 1799, 1999
];

export interface PricingRule {
  categorySlug?: string;
  marginPercent: number;
  minProfitSAR: number;
  maxPriceSAR?: number;
}

export interface PricingInput {
  cjPriceUSD: number;
  shippingUSD: number;
  marginPercent?: number;
  minProfitSAR?: number;
  categorySlug?: string;
}

export interface PricingResult {
  baseCostUSD: number;
  baseCostSAR: number;
  vatSAR: number;
  paymentFeeSAR: number;
  profitSAR: number;
  finalPriceSAR: number;
  roundedPriceSAR: number;
  actualMarginPercent: number;
  breakdown: {
    cjPriceUSD: number;
    shippingUSD: number;
    totalCostUSD: number;
    totalCostSAR: number;
    vatAmount: number;
    paymentFeeAmount: number;
    profitAmount: number;
    rawTotal: number;
    roundedTotal: number;
  };
  needsReview: boolean;
  reviewReason?: string;
}

const DEFAULT_MARGINS: Record<string, PricingRule> = {
  clothing: { marginPercent: 50, minProfitSAR: 25 },
  shoes: { marginPercent: 55, minProfitSAR: 30 },
  electronics: { marginPercent: 40, minProfitSAR: 35 },
  home: { marginPercent: 60, minProfitSAR: 20 },
  kitchen: { marginPercent: 55, minProfitSAR: 20 },
  beauty: { marginPercent: 65, minProfitSAR: 15 },
  jewelry: { marginPercent: 70, minProfitSAR: 20 },
  bags: { marginPercent: 55, minProfitSAR: 25 },
  watches: { marginPercent: 60, minProfitSAR: 35 },
  default: { marginPercent: 50, minProfitSAR: 25 },
};

function smartRound(price: number): number {
  if (price <= 0) return 29;
  
  for (const roundValue of SMART_ROUND_VALUES) {
    if (price <= roundValue) {
      return roundValue;
    }
  }
  
  return Math.ceil(price / 100) * 100 - 1;
}

export function getMarginRule(categorySlug?: string): PricingRule {
  if (!categorySlug) return DEFAULT_MARGINS.default;
  
  const normalized = categorySlug.toLowerCase().trim();
  
  for (const [key, rule] of Object.entries(DEFAULT_MARGINS)) {
    if (normalized.includes(key)) {
      return rule;
    }
  }
  
  return DEFAULT_MARGINS.default;
}

export function calculateKSAPrice(input: PricingInput): PricingResult {
  const rule = getMarginRule(input.categorySlug);
  const marginPercent = input.marginPercent ?? rule.marginPercent;
  const minProfitSAR = input.minProfitSAR ?? rule.minProfitSAR;
  const usdToSar = getUsdToSarRate();

  const totalCostUSD = input.cjPriceUSD + input.shippingUSD;
  const totalCostSAR = totalCostUSD * usdToSar;

  const costWithVAT = totalCostSAR * (1 + VAT_RATE);
  const marginMultiplier = 1 + marginPercent / 100;
  const priceBeforePaymentFee = costWithVAT * marginMultiplier;
  const priceWithPaymentFee = priceBeforePaymentFee / (1 - PAYMENT_FEE_RATE);
  
  const vatAmount = totalCostSAR * VAT_RATE;
  const paymentFeeAmount = priceWithPaymentFee * PAYMENT_FEE_RATE;
  const rawTotal = priceWithPaymentFee;
  const profitAmount = rawTotal - totalCostSAR - vatAmount - paymentFeeAmount;

  let finalPrice = rawTotal;
  let needsReview = false;
  let reviewReason: string | undefined;

  if (profitAmount < minProfitSAR) {
    const requiredPrice = (totalCostSAR + vatAmount + minProfitSAR) / (1 - PAYMENT_FEE_RATE);
    finalPrice = requiredPrice;
    needsReview = true;
    reviewReason = `Profit (${profitAmount.toFixed(2)} SAR) below minimum (${minProfitSAR} SAR). Price adjusted.`;
  }

  if (rule.maxPriceSAR && finalPrice > rule.maxPriceSAR) {
    needsReview = true;
    reviewReason = `Price (${finalPrice.toFixed(2)} SAR) exceeds category maximum (${rule.maxPriceSAR} SAR)`;
  }

  const roundedPrice = smartRound(finalPrice);
  const actualPaymentFee = roundedPrice * PAYMENT_FEE_RATE;
  const actualProfit = roundedPrice - totalCostSAR - vatAmount - actualPaymentFee;
  const actualMargin = totalCostSAR > 0 ? (actualProfit / totalCostSAR) * 100 : 0;

  return {
    baseCostUSD: totalCostUSD,
    baseCostSAR: totalCostSAR,
    vatSAR: vatAmount,
    paymentFeeSAR: paymentFeeAmount,
    profitSAR: actualProfit,
    finalPriceSAR: finalPrice,
    roundedPriceSAR: roundedPrice,
    actualMarginPercent: actualMargin,
    breakdown: {
      cjPriceUSD: input.cjPriceUSD,
      shippingUSD: input.shippingUSD,
      totalCostUSD,
      totalCostSAR,
      vatAmount,
      paymentFeeAmount,
      profitAmount: actualProfit,
      rawTotal,
      roundedTotal: roundedPrice,
    },
    needsReview,
    reviewReason,
  };
}

export function calculateBulkPricing(
  products: Array<{
    id: string;
    cjPriceUSD: number;
    shippingUSD: number;
    categorySlug?: string;
  }>,
  globalMarginPercent?: number,
  globalMinProfitSAR?: number
): Map<string, PricingResult> {
  const results = new Map<string, PricingResult>();

  for (const product of products) {
    const result = calculateKSAPrice({
      cjPriceUSD: product.cjPriceUSD,
      shippingUSD: product.shippingUSD,
      categorySlug: product.categorySlug,
      marginPercent: globalMarginPercent,
      minProfitSAR: globalMinProfitSAR,
    });
    results.set(product.id, result);
  }

  return results;
}

export function formatPriceSAR(price: number): string {
  return `${price.toFixed(2)} ر.س`;
}

export function formatPriceDisplay(price: number): string {
  return `SAR ${price.toFixed(0)}`;
}

export { DEFAULT_USD_TO_SAR_RATE, VAT_RATE, PAYMENT_FEE_RATE, SMART_ROUND_VALUES, getUsdToSarRate };
