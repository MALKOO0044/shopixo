"use client";

import { Star, TrendingUp, Image as ImageIcon, Tag, Ruler, FolderOpen, DollarSign, Info, Palette, Smartphone } from "lucide-react";
import type { PricedProduct } from "./types";

type PreviewPageOneProps = {
  product: PricedProduct;
};

<<<<<<< HEAD
// Component to display actual CJ rating with stars
=======
function calculateEstimatedRating(listedNum: number): { rating: number; reviewCount: number } {
  let rating: number;
  if (listedNum >= 2000) {
    rating = 4.8;
  } else if (listedNum >= 1000) {
    rating = 4.7;
  } else if (listedNum >= 500) {
    rating = 4.5;
  } else if (listedNum >= 200) {
    rating = 4.3;
  } else if (listedNum >= 100) {
    rating = 4.2;
  } else if (listedNum >= 50) {
    rating = 4.0;
  } else if (listedNum >= 20) {
    rating = 3.9;
  } else {
    rating = 3.8;
  }
  
  const reviewCount = listedNum >= 10 
    ? Math.round(listedNum * 0.15) 
    : Math.max(5, Math.round(listedNum * 0.5 + 3));
  
  return { rating, reviewCount };
}

>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
function StarRating({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.3;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          {[...Array(fullStars)].map((_, i) => (
            <Star key={`full-${i}`} className="h-6 w-6 fill-amber-400 text-amber-400" />
          ))}
          {hasHalfStar && (
            <div className="relative">
              <Star className="h-6 w-6 text-gray-300" />
              <div className="absolute inset-0 overflow-hidden w-1/2">
                <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
              </div>
            </div>
          )}
          {[...Array(emptyStars)].map((_, i) => (
            <Star key={`empty-${i}`} className="h-6 w-6 text-gray-300" />
          ))}
        </div>
        <span className="text-2xl font-bold text-gray-800">{rating.toFixed(1)}</span>
      </div>
      <div className="flex items-center gap-2 text-gray-600">
        <span className="font-medium">{reviewCount.toLocaleString()} reviews</span>
        <div className="group relative">
          <Info className="h-4 w-4 text-gray-400 cursor-help" />
          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-3 bg-gray-800 text-white text-sm rounded-lg shadow-lg z-10">
<<<<<<< HEAD
            Actual rating from CJ Dropshipping customer reviews
=======
            Shopixo estimated rating based on supplier data and product popularity
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
          </div>
        </div>
      </div>
    </div>
  );
}

function getPopularityInfo(listedNum: number): { label: string; level: number; color: string; bgColor: string } {
  if (listedNum >= 1000) {
    return { label: "Very Popular", level: 5, color: "text-green-700", bgColor: "bg-green-100" };
  }
  if (listedNum >= 500) {
    return { label: "Popular", level: 4, color: "text-emerald-700", bgColor: "bg-emerald-100" };
  }
  if (listedNum >= 100) {
    return { label: "Moderate Popularity", level: 3, color: "text-blue-700", bgColor: "bg-blue-100" };
  }
  if (listedNum >= 20) {
    return { label: "Low Popularity", level: 2, color: "text-amber-700", bgColor: "bg-amber-100" };
  }
  return { label: "New", level: 1, color: "text-gray-700", bgColor: "bg-gray-100" };
}

function PopularityDisplay({ listedNum }: { listedNum: number }) {
  const info = getPopularityInfo(listedNum);
  
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <span className={`px-4 py-2 rounded-lg font-semibold ${info.bgColor} ${info.color}`}>
          {info.label}
        </span>
        <span className="text-xl font-bold text-gray-800">{listedNum.toLocaleString()}</span>
        <span className="text-gray-500 text-sm">times listed</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-2 w-8 rounded ${i <= info.level ? 'bg-amber-400' : 'bg-gray-200'}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function PreviewPageOne({ product }: PreviewPageOneProps) {
  const uniqueSizes = product.availableSizes && product.availableSizes.length > 0
    ? product.availableSizes
    : [];
  const uniqueColors = product.availableColors && product.availableColors.length > 0
    ? product.availableColors
    : [];
  const uniqueModels = product.availableModels && product.availableModels.length > 0
    ? product.availableModels
    : [];

  const imageCount = product.images?.length || 0;
<<<<<<< HEAD
  
  // Check for REAL CJ rating data only - no fake/estimated ratings
  const hasRealRating = product.rating !== undefined && product.rating !== null && Number.isFinite(product.rating) && product.rating > 0 && product.rating <= 5;
  const realRating = hasRealRating ? product.rating! : null;
  // reviewCount of -1 indicates this is a supplier rating (not customer reviews)
  const isSupplierRating = product.reviewCount === -1;
  const realReviewCount = hasRealRating && !isSupplierRating ? (product.reviewCount || 0) : 0;
  
  console.log(`[PreviewPageOne] Product ${product.cjSku}: listedNum=${product.listedNum}, cjRating=${product.rating}, hasRealRating=${hasRealRating}, isSupplierRating=${isSupplierRating}, supplierName=${product.supplierName}, colors=${uniqueColors.length}, sizes=${uniqueSizes.length}, models=${uniqueModels.length}`);
=======
  const { rating, reviewCount } = calculateEstimatedRating(product.listedNum);
  
  console.log(`[PreviewPageOne] Product ${product.cjSku}: listedNum=${product.listedNum}, colors=${uniqueColors.length}, sizes=${uniqueSizes.length}, models=${uniqueModels.length}`);
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80

  return (
    <div className="flex flex-col lg:flex-row gap-8 p-4">
      {/* Main Image Section */}
      <div className="lg:w-1/2 flex flex-col items-center">
        <div className="relative w-full max-w-md aspect-square bg-gray-50 rounded-2xl overflow-hidden shadow-md border border-gray-100">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt="Product image"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder-product.png";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-20 w-20 text-gray-300" />
            </div>
          )}
        </div>
        
        {/* Image Count */}
        <div className="mt-4 flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full">
          <ImageIcon className="h-5 w-5" />
          <span className="font-medium">{imageCount} images available</span>
        </div>
      </div>

      {/* Product Details Section */}
      <div className="lg:w-1/2 space-y-8">
        
<<<<<<< HEAD
        {/* Rating - Show supplier rating from CJ website */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Star className="h-5 w-5 text-amber-500" />
            <span className="text-gray-500 font-medium">
              {isSupplierRating ? 'Supplier Rating' : 'Rating'}
            </span>
          </div>
          {hasRealRating && realRating !== null ? (
            <div className="flex flex-col gap-4">
              {/* Overall Rating Stars */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => {
                    const filled = i < Math.floor(realRating);
                    const half = !filled && i < realRating;
                    return (
                      <Star
                        key={`star-${i}`}
                        className={`h-6 w-6 ${filled || half ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                      />
                    );
                  })}
                </div>
                <span className="text-2xl font-bold text-gray-800">{realRating.toFixed(1)}</span>
              </div>
              
              {/* Supplier Name */}
              {isSupplierRating && product.supplierName && (
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="font-medium">Supplier: {product.supplierName}</span>
                </div>
              )}
              
              {/* Customer Reviews Count (if not supplier rating) */}
              {!isSupplierRating && (
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="font-medium">{realReviewCount.toLocaleString()} reviews</span>
                  <div className="group relative">
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-3 bg-gray-800 text-white text-sm rounded-lg shadow-lg z-10">
                      Actual rating from CJ Dropshipping customer reviews
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={`empty-${i}`} className="h-6 w-6 text-gray-300" />
                  ))}
                </div>
                <span className="text-xl font-medium text-gray-400">—</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <span className="font-medium">No rating available</span>
                <div className="group relative">
                  <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-3 bg-gray-800 text-white text-sm rounded-lg shadow-lg z-10">
                    Could not fetch supplier rating for this product
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Popularity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span className="text-gray-500 font-medium">Popularity</span>
            <div className="group relative">
              <Info className="h-4 w-4 text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-3 bg-gray-800 text-white text-sm rounded-lg shadow-lg z-10">
                Based on how many stores list this product on CJ Dropshipping
              </div>
            </div>
          </div>
          <PopularityDisplay listedNum={product.listedNum || 0} />
=======
        {/* Rating */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Star className="h-5 w-5 text-amber-500" />
            <span className="text-gray-500 font-medium">Rating</span>
          </div>
          <StarRating rating={rating} reviewCount={reviewCount} />
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
        </div>

        {/* SKU */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Tag className="h-5 w-5 text-blue-600" />
            <span className="text-gray-500 font-medium">Product SKU</span>
          </div>
          <p className="font-mono text-2xl font-bold text-blue-700 bg-blue-50 px-4 py-3 rounded-lg">
            {product.cjSku}
          </p>
        </div>

        {/* Colors */}
        {uniqueColors.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Palette className="h-5 w-5 text-pink-600" />
              <span className="text-gray-500 font-medium">Available Colors</span>
              <span className="text-sm text-gray-400">({uniqueColors.length})</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {uniqueColors.map((color, idx) => (
                <span
                  key={idx}
                  className="bg-pink-50 text-pink-700 px-4 py-2 rounded-lg font-semibold text-lg border border-pink-200"
                >
                  {color}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Compatible Devices/Models */}
        {uniqueModels.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Smartphone className="h-5 w-5 text-blue-600" />
              <span className="text-gray-500 font-medium">Compatible Devices</span>
              <span className="text-sm text-gray-400">({uniqueModels.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {uniqueModels.map((model, idx) => (
                <span
                  key={idx}
                  className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-medium text-sm border border-blue-200"
                >
                  {model}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Sizes (for clothing/shoes) */}
        {uniqueSizes.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Ruler className="h-5 w-5 text-purple-600" />
              <span className="text-gray-500 font-medium">Available Sizes</span>
              <span className="text-sm text-gray-400">({uniqueSizes.length})</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {uniqueSizes.map((size, idx) => (
                <span
                  key={idx}
                  className="bg-purple-50 text-purple-700 px-4 py-2 rounded-lg font-semibold text-lg border border-purple-200"
                >
                  {size}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* No variants message */}
        {uniqueColors.length === 0 && uniqueModels.length === 0 && uniqueSizes.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Ruler className="h-5 w-5 text-purple-600" />
              <span className="text-gray-500 font-medium">Available Sizes</span>
            </div>
            <p className="text-gray-400 text-lg">One Size</p>
          </div>
        )}

        {/* Category */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <FolderOpen className="h-5 w-5 text-green-600" />
            <span className="text-gray-500 font-medium">Category</span>
          </div>
          <p className="text-lg text-gray-800 font-medium">
            {product.categoryName || "Not specified"}
          </p>
        </div>

<<<<<<< HEAD
=======
        {/* Popularity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-5 w-5 text-amber-500" />
            <span className="text-gray-500 font-medium">Popularity</span>
          </div>
          <PopularityDisplay listedNum={product.listedNum} />
        </div>

>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
        {/* Price - Single Final Sell Price */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span className="text-gray-600 font-medium">Price</span>
          </div>
          {(() => {
            // Calculate final sell price from first available variant (highest shipping)
            const availableVariants = product.variants.filter(v => v.shippingAvailable);
            const firstVariant = availableVariants[0];
            
            if (firstVariant) {
              const productCostUSD = firstVariant.variantPriceUSD || 0;
              const shippingCostUSD = firstVariant.shippingPriceUSD || 0;
              const totalCostUSD = productCostUSD + shippingCostUSD;
              const profitMargin = 0.08;
              const sellPriceUSD = totalCostUSD / (1 - profitMargin);
              
              return (
                <div className="text-center py-2">
                  <span className="text-4xl font-bold text-green-700">
                    ${sellPriceUSD.toFixed(2)}
                  </span>
                  <p className="text-sm text-gray-500 mt-2">
                    Final price (includes product, shipping & 8% margin)
                  </p>
                </div>
              );
            } else {
              return (
                <p className="text-gray-500 italic text-center">Price unavailable</p>
              );
            }
          })()}
        </div>

      </div>
    </div>
  );
}
