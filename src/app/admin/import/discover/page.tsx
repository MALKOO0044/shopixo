"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Package, Loader2, CheckCircle, Star, Trash2, Eye, X, Play, TrendingUp, ChevronLeft, ChevronRight, Image as ImageIcon, BarChart3, DollarSign, Grid3X3, FileText, Truck } from "lucide-react";
import PreviewPageOne from "@/components/admin/import/preview/PreviewPageOne";
import PreviewPageThree from "@/components/admin/import/preview/PreviewPageThree";
import PreviewPageFour from "@/components/admin/import/preview/PreviewPageFour";
import PreviewPageFive from "@/components/admin/import/preview/PreviewPageFive";
import PreviewPageSix from "@/components/admin/import/preview/PreviewPageSix";
import type { PricedProduct, PricedVariant } from "@/components/admin/import/preview/types";

type Category = {
  categoryId: string;
  categoryName: string;
  children?: Category[];
};

type FeatureOption = {
  id: string;
  name: string;
  parentId?: string;
  level: number;
};

export default function ProductDiscoveryPage() {
  const [category, setCategory] = useState("all");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(50);
  const [minStock, setMinStock] = useState(0);
  const [maxPrice, setMaxPrice] = useState(100);
  const [minPrice, setMinPrice] = useState(0);
  const [profitMargin, setProfitMargin] = useState(8);
  const [popularity, setPopularity] = useState("any");
  const [minRating, setMinRating] = useState("any");
  const [freeShippingOnly, setFreeShippingOnly] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [searchProgress, setSearchProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<PricedProduct[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [features, setFeatures] = useState<FeatureOption[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    latency: number;
    categoryCount: number;
    message: string;
  } | null>(null);
  
  const [batchName, setBatchName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedBatchId, setSavedBatchId] = useState<number | null>(null);
  
  const [previewProduct, setPreviewProduct] = useState<PricedProduct | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const TOTAL_PREVIEW_PAGES = 6;

  const quantityPresets = [1000, 500, 250, 100, 50, 25, 10];
  const profitPresets = [100, 50, 25, 15, 8];
  
  // Category-specific size/feature options
  const categorySizeMap: Record<string, { label: string; sizes: string[] }> = {
    // Women's Clothing
    "women": { label: "Clothing Sizes", sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL"] },
    "plus-size": { label: "Plus Sizes", sizes: ["L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL"] },
    // Men's Clothing
    "men": { label: "Clothing Sizes", sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL"] },
    "men-plus-size": { label: "Plus Sizes", sizes: ["L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL"] },
    // Shoes
    "womens-shoes": { label: "Shoe Sizes", sizes: ["35", "36", "37", "38", "39", "40", "41", "42", "43"] },
    "mens-shoes": { label: "Shoe Sizes", sizes: ["38", "39", "40", "41", "42", "43", "44", "45", "46", "47", "48"] },
    "kids-shoes": { label: "Kids Shoe Sizes", sizes: ["20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35"] },
    // Phones & Accessories
    "mobile-accessories": { label: "Phone Models", sizes: ["iPhone 14", "iPhone 14 Pro", "iPhone 14 Pro Max", "iPhone 15", "iPhone 15 Pro", "iPhone 15 Pro Max", "iPhone 16", "iPhone 16 Pro", "iPhone 16 Pro Max", "Samsung S23", "Samsung S24", "Samsung S24 Ultra", "Xiaomi", "Huawei"] },
    // Jewelry & Watches
    "jewelry-accessories": { label: "Watch/Ring Sizes", sizes: ["Ring 5", "Ring 6", "Ring 7", "Ring 8", "Ring 9", "Ring 10", "Ring 11", "Ring 12", "38mm", "40mm", "42mm", "44mm", "46mm", "48mm"] },
    // Kids & Baby
    "kids-fashion": { label: "Kids Sizes", sizes: ["0-6M", "6-12M", "1-2Y", "2-3Y", "3-4Y", "4-5Y", "5-6Y", "6-7Y", "7-8Y", "8-10Y", "10-12Y"] },
    "baby-maternity": { label: "Baby Sizes", sizes: ["Newborn", "0-3M", "3-6M", "6-9M", "9-12M", "12-18M", "18-24M"] },
    "toys": { label: "Age Groups", sizes: ["0-6M", "6-12M", "1-2Y", "2-3Y", "3-5Y", "5-8Y", "8-12Y", "12+Y"] },
    // Pet Supplies
    "pet-supplies": { label: "Pet Sizes", sizes: ["XS", "S", "M", "L", "XL", "XXL"] },
    // Sports & Outdoor
    "sports": { label: "Sizes", sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL"] },
    // Underwear & Sleepwear
    "underwear-sleepwear": { label: "Sizes", sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"] },
    "men-underwear": { label: "Sizes", sizes: ["S", "M", "L", "XL", "XXL", "3XL", "4XL"] },
    // Bags
    "bags-luggage": { label: "Bag Sizes", sizes: ["Small", "Medium", "Large", "XL"] },
  };
  
  // Categories that don't need size filters
  const noSizeCategories = [
    "home-kitchen", "furniture", "health-beauty", "health-household", 
    "electronics", "tools-home-improvement", "automotive", "smart-home",
    "appliances", "office-school", "musical-instruments", "yard-garden",
    "business-industry-science", "arts-crafts-sewing"
  ];
  
  // Get sizes based on selected category/feature name
  const detectCategoryType = (name: string): string | null => {
    const n = name.toLowerCase();
    
    // No-size categories (return null)
    if (n.includes("electronic") || n.includes("إلكترون")) return null;
    if (n.includes("home") && (n.includes("kitchen") || n.includes("مطبخ"))) return null;
    if (n.includes("furniture") || n.includes("أثاث")) return null;
    if (n.includes("tool") || n.includes("أدوات")) return null;
    if (n.includes("auto") || n.includes("سيار") || n.includes("motor")) return null;
    if (n.includes("smart home") || n.includes("ذكي")) return null;
    if (n.includes("appliance") || n.includes("أجهزة")) return null;
    if (n.includes("office") || n.includes("مكتب")) return null;
    if (n.includes("music") || n.includes("موسيق")) return null;
    if (n.includes("garden") || n.includes("حديقة")) return null;
    if (n.includes("business") || n.includes("industry") || n.includes("science")) return null;
    if (n.includes("craft") || n.includes("sewing") || n.includes("حرف")) return null;
    if (n.includes("health") || n.includes("beauty") || n.includes("صحة") || n.includes("جمال")) return null;
    
    // Shoes
    if (n.includes("shoe") || n.includes("أحذية")) {
      if (n.includes("kid") || n.includes("أطفال") || n.includes("child")) return "kids-shoes";
      if (n.includes("men") || n.includes("رجال")) return "mens-shoes";
      return "womens-shoes";
    }
    
    // Phones & Mobile
    if (n.includes("phone") || n.includes("mobile") || n.includes("هاتف") || n.includes("جوال") || n.includes("case")) {
      return "mobile-accessories";
    }
    
    // Jewelry & Watches
    if (n.includes("watch") || n.includes("jewelry") || n.includes("ساعات") || n.includes("مجوهرات") || n.includes("ring") || n.includes("خاتم")) {
      return "jewelry-accessories";
    }
    
    // Pet Supplies
    if (n.includes("pet") || n.includes("حيوان") || n.includes("dog") || n.includes("cat")) {
      return "pet-supplies";
    }
    
    // Baby & Maternity
    if (n.includes("baby") || n.includes("رضيع") || n.includes("maternity") || n.includes("أمومة")) {
      return "baby-maternity";
    }
    
    // Kids Fashion
    if (n.includes("kid") || n.includes("أطفال") || n.includes("child") || n.includes("boy") || n.includes("girl")) {
      return "kids-fashion";
    }
    
    // Toys
    if (n.includes("toy") || n.includes("ألعاب") || n.includes("game")) {
      return "toys";
    }
    
    // Sports
    if (n.includes("sport") || n.includes("رياض") || n.includes("outdoor") || n.includes("fitness")) {
      return "sports";
    }
    
    // Bags & Luggage
    if (n.includes("bag") || n.includes("حقيب") || n.includes("luggage") || n.includes("backpack")) {
      return "bags-luggage";
    }
    
    // Underwear & Sleepwear
    if (n.includes("underwear") || n.includes("sleepwear") || n.includes("داخلي") || n.includes("نوم") || n.includes("pajama")) {
      if (n.includes("men") || n.includes("رجال")) return "men-underwear";
      return "underwear-sleepwear";
    }
    
    // Plus Size
    if (n.includes("plus") || n.includes("كبير")) {
      if (n.includes("men") || n.includes("رجال")) return "men-plus-size";
      return "plus-size";
    }
    
    // Men's Clothing
    if (n.includes("men") || n.includes("رجال")) {
      return "men";
    }
    
    // Women's Clothing (default for clothing)
    if (n.includes("women") || n.includes("نساء") || n.includes("نسائ") || n.includes("dress") || n.includes("فستان") || 
        n.includes("blouse") || n.includes("shirt") || n.includes("skirt") || n.includes("pant") || n.includes("jacket")) {
      return "women";
    }
    
    // If clothing-related but not specific, return women as default
    if (n.includes("cloth") || n.includes("ملابس") || n.includes("fashion") || n.includes("أزياء")) {
      return "women";
    }
    
    // Unknown category - return null (no size filter)
    return null;
  };
  
  const getAvailableSizes = (): { label: string; sizes: string[] } | null => {
    // Check selected features first (more specific)
    for (const featureId of selectedFeatures) {
      const feature = features.find(f => f.id === featureId);
      if (feature) {
        const catType = detectCategoryType(feature.name);
        if (catType === null) return null;
        if (categorySizeMap[catType]) return categorySizeMap[catType];
      }
    }
    
    // Check main category
    if (category !== "all") {
      const catName = categories.find(c => c.categoryId === category)?.categoryName || "";
      const catType = detectCategoryType(catName);
      if (catType === null) return null;
      if (categorySizeMap[catType]) return categorySizeMap[catType];
    }
    
    // Default: show clothing sizes (most common use case)
    return categorySizeMap["women"];
  };
  
  const availableSizeConfig = getAvailableSizes();
  
  // Clear selected sizes when category changes
  useEffect(() => {
    setSelectedSizes([]);
  }, [category, selectedFeatures.length]);

  const testConnection = async () => {
    const start = Date.now();
    try {
      const res = await fetch("/api/admin/cj/categories");
      const data = await res.json();
      const latency = Date.now() - start;
      
      if (data.ok && data.categories) {
        setCategories(data.categories);
        setConnectionStatus({
          connected: true,
          latency,
          categoryCount: data.categories.length,
          message: `Connected successfully. Found ${data.categories.length} category groups.`
        });
        
        const allFeatures: FeatureOption[] = [];
        const extractFeatures = (cats: Category[], level: number = 0, parentId?: string) => {
          for (const cat of cats) {
            allFeatures.push({
              id: cat.categoryId,
              name: cat.categoryName,
              parentId,
              level,
            });
            if (cat.children && cat.children.length > 0) {
              extractFeatures(cat.children, level + 1, cat.categoryId);
            }
          }
        };
        extractFeatures(data.categories);
        setFeatures(allFeatures);
      } else {
        setConnectionStatus({
          connected: false,
          latency,
          categoryCount: 0,
          message: data.error || "Connection failed"
        });
      }
    } catch (e: any) {
      setConnectionStatus({
        connected: false,
        latency: Date.now() - start,
        categoryCount: 0,
        message: e?.message || "Connection failed"
      });
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  const loadFeatures = async (categoryId: string) => {
    if (categoryId === "all") {
      setSelectedFeatures([]);
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/cj/categories?parentId=${categoryId}`);
      const data = await res.json();
      if (data.ok && data.categories) {
        const newFeatures: FeatureOption[] = data.categories.map((cat: Category) => ({
          id: cat.categoryId,
          name: cat.categoryName,
          parentId: categoryId,
          level: 2,
        }));
        setFeatures(prev => {
          const filtered = prev.filter(f => f.parentId !== categoryId);
          return [...filtered, ...newFeatures];
        });
      }
    } catch (e) {
      console.error("Failed to load features:", e);
    }
  };

  const searchProducts = async () => {
    if (category === "all" && selectedFeatures.length === 0) {
      setError("Please select a category or feature to search");
      return;
    }
    
    setLoading(true);
    setError(null);
    setProducts([]);
    setSelected(new Set());
    setSavedBatchId(null);
    setSearchProgress("Searching products and calculating prices (estimated 2 min)...");
    
    try {
      const categoryIds = selectedFeatures.length > 0 ? selectedFeatures : [category];
      
      const params = new URLSearchParams({
        categoryIds: categoryIds.join(","),
        quantity: quantity.toString(),
        minPrice: minPrice.toString(),
        maxPrice: maxPrice.toString(),
        minStock: minStock.toString(),
        profitMargin: profitMargin.toString(),
        popularity: popularity,
        minRating: minRating,
        freeShippingOnly: freeShippingOnly ? "1" : "0",
        sizes: selectedSizes.join(","),
      });
      
      const res = await fetch(`/api/admin/cj/products/search-and-price?${params}`, {
        method: 'GET',
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Search failed: ${res.status}`);
      }
      
      const pricedProducts: PricedProduct[] = data.products || [];
      setProducts(pricedProducts);
      
      if (pricedProducts.length === 0) {
        setError("No products found. Try different filters or select more features.");
      }
      
    } catch (e: any) {
      setError(e?.message || "Search failed");
    } finally {
      setLoading(false);
      setSearchProgress("");
    }
  };

  const toggleSelect = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(products.map(p => p.pid)));
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  const removeProduct = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProducts(prev => prev.filter(p => p.pid !== productId));
    setSelected(prev => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  };

  const openPreview = (product: PricedProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewProduct(product);
    setPreviewPage(1);
  };

  const nextPage = () => {
    if (previewPage < TOTAL_PREVIEW_PAGES) {
      setPreviewPage(previewPage + 1);
    }
  };

  const prevPage = () => {
    if (previewPage > 1) {
      setPreviewPage(previewPage - 1);
    }
  };

  const getPageTitle = (page: number) => {
    switch (page) {
      case 1: return "نظرة عامة";
      case 2: return "معرض الصور";
      case 3: return "المواصفات";
      case 4: return "المخزون والشعبية";
      case 5: return "الشحن والتوصيل";
      case 6: return "تفاصيل الأسعار";
      default: return "معاينة المنتج";
    }
  };

  const getPageIcon = (page: number) => {
    switch (page) {
      case 1: return <Package className="h-4 w-4" />;
      case 2: return <Grid3X3 className="h-4 w-4" />;
      case 3: return <FileText className="h-4 w-4" />;
      case 4: return <BarChart3 className="h-4 w-4" />;
      case 5: return <Truck className="h-4 w-4" />;
      case 6: return <DollarSign className="h-4 w-4" />;
      default: return null;
    }
  };

  const saveBatch = async () => {
    if (selected.size === 0) return;
    
    setSaving(true);
    try {
      const selectedProducts = products.filter(p => selected.has(p.pid));
      const res = await fetch("/api/admin/import/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: batchName || `Discovery ${new Date().toLocaleDateString()}`,
          products: selectedProducts.map(p => ({
            cjProductId: p.pid,
            cjSku: p.cjSku,
            name: p.name,
            images: p.images,
            minPriceSAR: p.minPriceSAR,
            maxPriceSAR: p.maxPriceSAR,
            avgPriceSAR: p.avgPriceSAR,
            stock: p.stock,
            variants: p.variants,
          })),
        }),
      });
      
      const data = await res.json();
      if (data.ok && data.batchId) {
        setSavedBatchId(data.batchId);
      } else {
        throw new Error(data.error || "Failed to save batch");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to save batch");
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = (featureId: string) => {
    setSelectedFeatures(prev => {
      if (prev.includes(featureId)) {
        return prev.filter(f => f !== featureId);
      } else {
        return [...prev, featureId];
      }
    });
  };

  const getFeatureName = (id: string) => {
    const feature = features.find(f => f.id === id);
    return feature?.name || id;
  };

  const getCategoryChildren = (parentId: string) => {
    return features.filter(f => f.parentId === parentId);
  };

  const selectedCategory = categories.find(c => c.categoryId === category);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Search Products</h1>
      </div>

      {connectionStatus && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
          connectionStatus.connected 
            ? "bg-green-50 border-green-200" 
            : "bg-red-50 border-red-200"
        }`}>
          <button
            onClick={testConnection}
            className="px-4 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Test Connection
          </button>
          <span className="text-sm text-gray-600">{connectionStatus.latency}ms</span>
          <span className={`text-sm ${connectionStatus.connected ? "text-green-700" : "text-red-700"}`}>
            CJ Dropshipping API {connectionStatus.connected ? "●" : "○"} {connectionStatus.message}
          </span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="block text-sm text-gray-600 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSelectedFeatures([]);
                loadFeatures(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.categoryId} value={cat.categoryId}>
                  {cat.categoryName}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-2">Features ({selectedFeatures.length} selected)</label>
            <div className="relative">
              <select
                onChange={(e) => {
                  if (e.target.value) toggleFeature(e.target.value);
                  e.target.value = "";
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded appearance-none"
              >
                <option value="">Select features...</option>
                {selectedCategory?.children?.map(child => (
                  <optgroup key={child.categoryId} label={child.categoryName}>
                    {child.children?.map(subChild => (
                      <option 
                        key={subChild.categoryId} 
                        value={subChild.categoryId}
                        disabled={selectedFeatures.includes(subChild.categoryId)}
                      >
                        {subChild.categoryName}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedFeatures.map(featureId => (
                <span
                  key={featureId}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs"
                >
                  {getFeatureName(featureId)}
                  <button
                    onClick={() => toggleFeature(featureId)}
                    className="hover:text-amber-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-2">Quantity to Find</label>
            <div className="flex gap-1 mb-2">
              {quantityPresets.map(preset => (
                <button
                  key={preset}
                  onClick={() => setQuantity(preset)}
                  className={`px-2 py-1 text-xs rounded ${
                    quantity === preset
                      ? "bg-amber-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded text-left"
              dir="ltr"
            />
          </div>
        </div>

        <div className="grid grid-cols-6 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">Min Price (USD)</label>
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded text-left"
              dir="ltr"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-2">Max Price (USD)</label>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded text-left"
              dir="ltr"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-2">Min Stock</label>
            <input
              type="number"
              value={minStock}
              onChange={(e) => setMinStock(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded text-left"
              dir="ltr"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-2">Popularity</label>
            <select
              value={popularity}
              onChange={(e) => setPopularity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="any">Any Popularity</option>
              <option value="high">High (1000+ listed)</option>
              <option value="medium">Medium (100-999 listed)</option>
              <option value="low">Low (&lt;100 listed)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-2 flex items-center gap-1">
              <Star className="h-4 w-4 text-amber-500" />
              Min Rating
            </label>
            <select
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="any">Any Rating</option>
              <option value="4.5">4.5+ Stars</option>
              <option value="4">4+ Stars</option>
              <option value="3.5">3.5+ Stars</option>
              <option value="3">3+ Stars</option>
            </select>
          </div>
          
        </div>
        
        {availableSizeConfig && (
          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Filter by {availableSizeConfig.label} (optional - leave empty for all)
            </label>
            <div className="flex flex-wrap gap-2">
              {availableSizeConfig.sizes.map(size => (
                <button
                  key={size}
                  onClick={() => {
                    setSelectedSizes(prev => 
                      prev.includes(size) 
                        ? prev.filter(s => s !== size) 
                        : [...prev, size]
                    );
                  }}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    selectedSizes.includes(size)
                      ? "bg-purple-500 text-white border-purple-500"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {size}
                </button>
              ))}
              {selectedSizes.length > 0 && (
                <button
                  onClick={() => setSelectedSizes([])}
                  className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  Clear All
                </button>
              )}
            </div>
            {selectedSizes.length > 0 && (
              <p className="text-xs text-purple-600 mt-2">
                Filtering for: {selectedSizes.join(", ")}
              </p>
            )}
          </div>
        )}
        
        {!availableSizeConfig && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-sm text-gray-500">
              Size filter not applicable for this category
            </p>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-amber-700 font-medium">*Profit Margin % ({profitMargin}%)</span>
              <div className="flex gap-1">
                {profitPresets.map(preset => (
                  <button
                    key={preset}
                    onClick={() => setProfitMargin(preset)}
                    className={`px-3 py-1.5 text-sm rounded ${
                      profitMargin === preset
                        ? "bg-amber-500 text-white font-medium"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
              <span className="text-gray-400">%</span>
              <input
                type="number"
                value={profitMargin}
                onChange={(e) => setProfitMargin(Number(e.target.value))}
                className="w-16 px-2 py-1.5 border border-gray-300 rounded text-center"
                dir="ltr"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                checked={freeShippingOnly}
                onChange={(e) => setFreeShippingOnly(e.target.checked)}
                className="w-4 h-4 border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700">Free Shipping Only</label>
            </div>
          </div>
          <p className="text-xs text-amber-600 mt-2 text-right">
            Set your desired profit margin. Products will display final SAR sell prices including shipping + profit when search completes.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Link
            href={"/admin/import/queue" as Route}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            Review Queue
          </Link>
          <button
            onClick={searchProducts}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Search Products
          </button>
        </div>
      </div>

      {loading && searchProgress && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
            <div className="flex-1">
              <div className="h-2 bg-amber-200 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
            <span className="text-sm text-amber-700">{searchProgress}</span>
          </div>
          <p className="text-xs text-amber-600 mt-2">
            Searching products, calculating shipping costs, and applying {profitMargin}% profit margin. Products will display final SAR sell prices including shipping + profit when search completes.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {products.length > 0 && (
        <>
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-900">
                Found <strong>{products.length}</strong> products with prices
              </span>
              <span className="text-sm text-gray-400">|</span>
              <span className="text-sm text-gray-600">
                <strong>{selected.size}</strong> selected
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={selectAll} className="text-sm text-blue-600 hover:underline">Select All</button>
              <button onClick={deselectAll} className="text-sm text-gray-500 hover:underline">Clear</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => {
              const isSelected = selected.has(product.pid);
              
              return (
                <div
                  key={product.pid}
                  className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${
                    isSelected ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <div className="relative aspect-square bg-gray-100">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Package className="h-12 w-12" />
                      </div>
                    )}
                    
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <button
                        onClick={(e) => toggleSelect(product.pid, e)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                          isSelected ? "bg-blue-500" : "bg-white border border-gray-300 hover:bg-gray-100"
                        }`}
                      >
                        {isSelected && <CheckCircle className="h-4 w-4 text-white" />}
                      </button>
                    </div>
                    
                    <div className="absolute top-2 left-2 flex gap-1">
                      <button
                        onClick={(e) => openPreview(product, e)}
                        className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center hover:bg-white"
                        title="Preview"
                      >
                        <Eye className="h-3.5 w-3.5 text-gray-700" />
                      </button>
                      <button
                        onClick={(e) => removeProduct(product.pid, e)}
                        className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center hover:bg-red-50"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </button>
                    </div>
                    
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/70 rounded text-xs text-white">
                      <TrendingUp className="h-3 w-3" />
                      {product.listedNum || 0}
                    </div>
                  </div>
                  
                  <div className="p-3 space-y-2">
                    <h3 className="font-medium text-gray-900 text-sm line-clamp-2 leading-tight" dir="ltr">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-400 font-mono" title={product.cjSku}>
                      SKU: {product.cjSku.length > 12 ? `...${product.cjSku.slice(-8)}` : product.cjSku}
                    </p>
                    
                    <div className="bg-green-50 rounded-lg p-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Sell Price (SAR)</span>
                        <span className="font-bold text-green-700 text-lg">
                          {product.minPriceSAR === product.maxPriceSAR
                            ? `${product.avgPriceSAR.toFixed(0)} SAR`
                            : `${product.minPriceSAR.toFixed(0)} - ${product.maxPriceSAR.toFixed(0)} SAR`
                          }
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex flex-col">
                        <span className="text-gray-500">Stock</span>
                        <span className={`font-semibold ${product.stock > 0 ? "text-gray-900" : "text-red-500"}`}>
                          {product.stock}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500">Variants</span>
                        <span className="font-semibold text-gray-900">
                          {product.successfulVariants}/{product.totalVariants}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selected.size > 0 && (
            <div className="sticky bottom-4 bg-white rounded-xl border shadow-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selected.size} products selected</p>
                  <p className="text-sm text-gray-500">Ready to add to import queue</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="Batch name (optional)"
                  className="px-3 py-2 border rounded-lg text-sm w-48"
                  dir="ltr"
                />
                <button
                  onClick={saveBatch}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Add to Queue
                </button>
              </div>
            </div>
          )}

          {savedBatchId && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-800">
                  {selected.size} products added to queue successfully!
                </span>
              </div>
              <Link
                href={"/admin/import/queue" as Route}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                View Queue
              </Link>
            </div>
          )}
        </>
      )}

      {previewProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPreviewProduct(null)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header with page navigation */}
            <div className="bg-white border-b p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {getPageIcon(previewPage)}
                <h3 className="text-lg font-semibold">{getPageTitle(previewPage)}</h3>
              </div>
              
              {/* Page indicator and navigation */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={prevPage}
                    disabled={previewPage === 1}
                    className={`p-2 rounded-full transition-colors ${
                      previewPage === 1 
                        ? "text-gray-300 cursor-not-allowed" 
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  {/* Page dots */}
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: TOTAL_PREVIEW_PAGES }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setPreviewPage(i + 1)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          previewPage === i + 1 
                            ? "bg-blue-600 w-6" 
                            : "bg-gray-300 hover:bg-gray-400"
                        }`}
                      />
                    ))}
                  </div>
                  
                  <button 
                    onClick={nextPage}
                    disabled={previewPage === TOTAL_PREVIEW_PAGES}
                    className={`p-2 rounded-full transition-colors ${
                      previewPage === TOTAL_PREVIEW_PAGES 
                        ? "text-gray-300 cursor-not-allowed" 
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
                
                <span className="text-sm text-gray-500 font-medium">
                  {previewPage} / {TOTAL_PREVIEW_PAGES}
                </span>
                
                <button onClick={() => setPreviewProduct(null)} className="p-2 hover:bg-gray-100 rounded-full ml-2">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Page content */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Page 1: Product Overview */}
              {previewPage === 1 && (
                <PreviewPageOne product={previewProduct} />
              )}
              
              {/* Page 2: Image Gallery */}
              {previewPage === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">All Product Images ({previewProduct.images?.length || 0})</h4>
                  </div>
                  
                  {previewProduct.images && previewProduct.images.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {previewProduct.images.map((img, index) => (
                        <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group">
                          <img 
                            src={img} 
                            alt={`${previewProduct.name} - Image ${index + 1}`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <ImageIcon className="h-12 w-12 mb-3" />
                      <p>No images available</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Page 3: Product Specifications */}
              {previewPage === 3 && (
                <PreviewPageThree product={previewProduct} />
              )}
              
              {/* Page 4: Stock & Popularity */}
              {previewPage === 4 && (
                <PreviewPageFour product={previewProduct} />
              )}

              {/* Page 5: Shipping & Delivery */}
              {previewPage === 5 && (
                <PreviewPageFive product={previewProduct} />
              )}
              
              {/* Page 6: Variant Pricing */}
              {previewPage === 6 && (
                <PreviewPageSix product={previewProduct} />
              )}
            </div>
            
            {/* Footer navigation */}
            <div className="bg-gray-50 border-t p-4 flex items-center justify-between shrink-0">
              <button 
                onClick={prevPage}
                disabled={previewPage === 1}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  previewPage === 1 
                    ? "text-gray-400 cursor-not-allowed" 
                    : "text-gray-700 hover:bg-gray-200"
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              
              <div className="text-sm text-gray-500">
                Page {previewPage} of {TOTAL_PREVIEW_PAGES}
              </div>
              
              <button 
                onClick={nextPage}
                disabled={previewPage === TOTAL_PREVIEW_PAGES}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  previewPage === TOTAL_PREVIEW_PAGES 
                    ? "text-gray-400 cursor-not-allowed" 
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
