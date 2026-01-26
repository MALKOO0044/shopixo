export type ShippingOption = {
  name: string;
  code: string;
  priceUSD: number;
  deliveryDays: string;
};

export type PricedVariant = {
  variantId: string;
  variantSku: string;
  variantPriceUSD: number;
  shippingAvailable: boolean;
  shippingPriceUSD: number;
  shippingPriceSAR: number;
  deliveryDays: string;
  logisticName?: string;
  sellPriceSAR: number;
  totalCostSAR: number;
  profitSAR: number;
  error?: string;
  stock?: number;
  cjStock?: number;
  factoryStock?: number;
  variantName?: string;
  variantImage?: string;
  size?: string;
  color?: string;
  allShippingOptions?: ShippingOption[];
};

export type WarehouseStock = {
  areaId: number;
  areaName: string;
  countryCode: string;
  totalInventory: number;
  cjInventory: number;
  factoryInventory: number;
};

export type ProductInventory = {
  totalCJ: number;
  totalFactory: number;
  totalAvailable: number;
  warehouses: WarehouseStock[];
};

export type InventoryVariant = {
  variantId: string;
  sku: string;
  shortName: string;
  priceUSD: number;
  cjStock: number;
  factoryStock: number;
  totalStock: number;
};

export type PricedProduct = {
  pid: string;
  cjSku: string;
  name: string;
  images: string[];
  minPriceSAR: number;
  maxPriceSAR: number;
  avgPriceSAR: number;
  stock: number;
  listedNum: number;
  totalVerifiedInventory?: number;
  totalUnVerifiedInventory?: number;
  inventory?: ProductInventory;
  inventoryStatus?: 'ok' | 'error' | 'partial';
  inventoryErrorMessage?: string;
  variants: PricedVariant[];
  inventoryVariants?: InventoryVariant[];
  successfulVariants: number;
  totalVariants: number;
  description?: string;
  overview?: string;
  productInfo?: string;
  sizeInfo?: string;
  productNote?: string;
  packingList?: string;
  rating?: number;
  reviewCount?: number;
<<<<<<< HEAD
  supplierName?: string;
=======
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
  categoryName?: string;
  productWeight?: number;
  packLength?: number;
  packWidth?: number;
  packHeight?: number;
  material?: string;
  productType?: string;
  sizeChartImages?: string[];
  processingTimeHours?: number;
  deliveryTimeHours?: number;
  estimatedProcessingDays?: string;
  estimatedDeliveryDays?: string;
  originCountry?: string;
  hsCode?: string;
  videoUrl?: string;
  availableSizes?: string[];
  availableColors?: string[];
  availableModels?: string[];
<<<<<<< HEAD
  colorImageMap?: Record<string, string>;
=======
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
};
