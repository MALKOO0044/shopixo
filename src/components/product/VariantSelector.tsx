"use client";

import { useState, useEffect, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import SmartImage from "@/components/smart-image";

export type VariantOption = {
  id: number;
  color?: string;
  colorImage?: string;
  size?: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  cjVariantId?: string;
};

type Props = {
  variants: VariantOption[];
  availableColors?: string[];
  availableSizes?: string[];
  onVariantChange?: (variant: VariantOption | null) => void;
  initialColor?: string;
  initialSize?: string;
};

export default function VariantSelector({
  variants,
  availableColors = [],
  availableSizes = [],
  onVariantChange,
  initialColor,
  initialSize,
}: Props) {
  const colors = useMemo(() => {
    if (availableColors.length > 0) return availableColors;
    const unique = new Set<string>();
    variants.forEach(v => { if (v.color) unique.add(v.color); });
    return Array.from(unique);
  }, [variants, availableColors]);

  const sizes = useMemo(() => {
    if (availableSizes.length > 0) return availableSizes;
    const unique = new Set<string>();
    variants.forEach(v => { if (v.size) unique.add(v.size); });
    return Array.from(unique);
  }, [variants, availableSizes]);

  const [selectedColor, setSelectedColor] = useState<string>(initialColor || colors[0] || "");
  const [selectedSize, setSelectedSize] = useState<string>(initialSize || "");

  const colorImages = useMemo(() => {
    const map: Record<string, string> = {};
    variants.forEach(v => {
      if (v.color && v.colorImage && !map[v.color]) {
        map[v.color] = v.colorImage;
      }
    });
    return map;
  }, [variants]);

  const availableSizesForColor = useMemo(() => {
    if (!selectedColor) return sizes;
    const available = new Set<string>();
    variants.forEach(v => {
      // Treat stock=0, null, undefined as "available" (unknown availability from CJ)
      // CJ often returns 0 as default when stock data isn't available
      const isAvailable = v.stock === null || v.stock === undefined || v.stock === 0 || v.stock > 0;
      if (v.color === selectedColor && v.size && isAvailable) {
        available.add(v.size);
      }
    });
    return sizes.filter(s => available.has(s));
  }, [selectedColor, variants, sizes]);

  const selectedVariant = useMemo(() => {
    return variants.find(v => 
      v.color === selectedColor && v.size === selectedSize
    ) || null;
  }, [variants, selectedColor, selectedSize]);

  useEffect(() => {
    onVariantChange?.(selectedVariant);
  }, [selectedVariant, onVariantChange]);

  const isSizeOutOfStock = (size: string) => {
    const variant = variants.find(v => 
      v.color === selectedColor && v.size === size
    );
    // Treat stock=0, null, undefined as "available" (unknown availability from CJ)
    // CJ often returns 0 as default when stock data isn't available
    if (!variant) return true;
    if (variant.stock === null || variant.stock === undefined || variant.stock === 0) return false;
    return variant.stock < 0; // Only negative stock (shouldn't happen) is out of stock
  };

  if (colors.length === 0 && sizes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {colors.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-gray-700">Color:</span>
            <span className="text-sm text-gray-900 font-semibold">{selectedColor}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => {
              const colorImg = colorImages[color];
              const isSelected = selectedColor === color;
              
              return (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`relative w-12 h-12 rounded-md border-2 overflow-hidden transition-all ${
                    isSelected 
                      ? "border-red-500 ring-2 ring-red-500/20" 
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                  title={color}
                >
                  {colorImg ? (
                    <SmartImage
                      src={colorImg}
                      alt={color}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center text-xs text-gray-500 bg-gray-100"
                    >
                      {color.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-gray-700">Size:</span>
            {selectedSize && (
              <span className="text-sm text-gray-900 font-semibold">{selectedSize}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const isSelected = selectedSize === size;
              const outOfStock = isSizeOutOfStock(size);
              const notAvailable = !availableSizesForColor.includes(size);
              
              return (
                <button
                  key={size}
                  onClick={() => !outOfStock && !notAvailable && setSelectedSize(size)}
                  disabled={outOfStock || notAvailable}
                  className={`px-4 py-2 min-w-[48px] rounded-md border text-sm font-medium transition-all ${
                    isSelected 
                      ? "bg-gray-900 text-white border-gray-900" 
                      : outOfStock || notAvailable
                        ? "bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed line-through"
                        : "bg-white text-gray-700 border-gray-300 hover:border-gray-900"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedVariant && (
        <div className="p-4 bg-green-50 rounded-lg border border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-green-700">Selected:</span>
              <span className="ml-2 font-medium text-green-900">
                {selectedColor}{selectedSize ? ` - ${selectedSize}` : ""}
              </span>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-green-900">
                {formatCurrency(selectedVariant.price)}
              </div>
              {selectedVariant.compareAtPrice && selectedVariant.compareAtPrice > selectedVariant.price && (
                <div className="text-sm text-gray-400 line-through">
                  {formatCurrency(selectedVariant.compareAtPrice)}
                </div>
              )}
            </div>
          </div>
          {selectedVariant.stock > 0 && selectedVariant.stock <= 10 && (
            <div className="mt-2 text-sm text-orange-600">
              Only {selectedVariant.stock} left in stock!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
