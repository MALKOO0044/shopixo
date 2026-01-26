"use client";

import { useState } from "react";
import { Star, ThumbsUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface Review {
  id: number;
  author: string;
  date: string;
  rating: number;
  content: string;
  helpful: number;
  images?: string[];
  purchased?: string;
  fit?: string;
}

interface RelatedProduct {
  id: number;
  slug: string;
  title: string;
  image: string;
  price: number;
  originalPrice?: number;
  rating: number;
  badge?: string;
}

interface ProductTabsProps {
  description?: string;
  highlights?: string[];
  sellingPoints?: string[];
  specifications?: Record<string, string>;
  reviews?: Review[];
  averageRating?: number;
  totalReviews?: number;
  recommendations?: RelatedProduct[];
}

const MOCK_REVIEWS: Review[] = [
  {
    id: 1,
    author: "E***n",
    date: "Nov 14, 2025",
    rating: 5,
    content: "In the color olive, there is a zipper at the back and that's why the dress fit me well. In my opinion, it's a purchase recommendation.",
    helpful: 5,
    purchased: "Color: Olive, Size: L",
    fit: "True to size",
  },
  {
    id: 2,
    author: "D***M",
    date: "Nov 06, 2025",
    rating: 1,
    content: "Way too small. I would like to return",
    helpful: 1,
    purchased: "Color: Olive, Size: M",
    fit: "Small",
  },
];

export default function ProductTabs({
  description = "",
  highlights = [],
  sellingPoints = [],
  specifications = {},
  reviews = MOCK_REVIEWS,
  averageRating = 4.3,
  totalReviews = 6,
  recommendations = [],
}: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "reviews" | "recommendations">("overview");

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "reviews" as const, label: `Reviews (${totalReviews})` },
    { id: "recommendations" as const, label: "Recommendations" },
  ];

  const ratingBreakdown = {
    "Smaller than average": 43,
    "True to size": 57,
    "Larger than average": 0,
  };

  return (
    <div className="mt-8 border-t pt-6">
      <div className="flex gap-6 border-b mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "text-gray-900 border-b-2 border-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          {highlights.length > 0 && (
            <div>
              <h3 className="font-bold text-lg mb-3">Highlights</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                {highlights.map((h, i) => (
                  <li key={i}>- {h}</li>
                ))}
              </ul>
            </div>
          )}

          {sellingPoints.length > 0 && (
            <div>
              <h3 className="font-bold text-lg mb-3">Selling Points</h3>
              <ol className="space-y-1 text-sm text-gray-700 list-decimal pl-5">
                {sellingPoints.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ol>
            </div>
          )}

          {Object.keys(specifications).length > 0 && (
            <div>
              <h3 className="font-bold text-lg mb-3">Specifications</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {Object.entries(specifications).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-gray-500">{key}:</span>{" "}
                    <span className="text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {description && (
            <div>
              <h3 className="font-bold text-lg mb-3">More about this item</h3>
              <p className="text-sm text-gray-700 whitespace-pre-line">{description}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "reviews" && (
        <div className="space-y-6">
          <div className="flex items-start gap-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl font-bold">{averageRating}</span>
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(averageRating)
                          ? "fill-amber-400 text-amber-400"
                          : "fill-gray-200 text-gray-200"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm text-blue-600">All reviews are from Verified Buyers</p>
            </div>
            <div className="flex-1 max-w-xs">
              {Object.entries(ratingBreakdown).map(([label, percent]) => (
                <div key={label} className="flex items-center gap-2 text-sm mb-1">
                  <span className="w-36 text-gray-600">{label}</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded">
                    <div
                      className="h-full bg-green-500 rounded"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-gray-600">{percent}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6 pt-4 border-t">
            {reviews.map((review) => (
              <div key={review.id} className="pb-4 border-b last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "fill-gray-200 text-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">{review.author}</span>
                    <span className="text-sm text-gray-400">{review.date}</span>
                  </div>
                  <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                    <ThumbsUp className="w-4 h-4" />
                    helpful ({review.helpful})
                  </button>
                </div>
                <p className="text-sm text-gray-700 mb-2">{review.content}</p>
                {review.images && review.images.length > 0 && (
                  <div className="flex gap-2 mb-2">
                    {review.images.map((img, i) => (
                      <div key={i} className="w-16 h-16 rounded overflow-hidden relative">
                        <Image src={img} alt="" fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}
                {review.purchased && (
                  <p className="text-xs text-gray-500">
                    Purchased: {review.purchased}
                    {review.fit && ` | Overall Fit: ${review.fit}`}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "recommendations" && (
        <div>
          <h3 className="font-bold text-lg mb-4">Recommendations</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {recommendations.length > 0 ? (
              recommendations.map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.slug}`}
                  className="group"
                >
                  <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 mb-2">
                    <Image
                      src={product.image}
                      alt={product.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                    {product.badge && (
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded">
                        {product.badge}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="bg-white px-3 py-1 text-sm font-medium rounded shadow">
                        QUICK SHOP
                      </span>
                    </div>
                  </div>
                  <h4 className="text-sm text-gray-700 line-clamp-2 group-hover:text-red-600">
                    {product.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold text-red-600">${product.price.toFixed(2)}</span>
                    {product.originalPrice && (
                      <span className="text-xs text-gray-400 line-through">
                        ${product.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < Math.floor(product.rating)
                            ? "fill-amber-400 text-amber-400"
                            : "fill-gray-200 text-gray-200"
                        }`}
                      />
                    ))}
                    <span className="text-xs text-gray-500">{product.rating}</span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-gray-500 col-span-full">No recommendations available yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
