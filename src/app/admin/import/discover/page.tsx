"use client";

import { useState, useEffect, useMemo, useRef, type MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Package, Loader2, CheckCircle, Star, Trash2, Eye, X, Play, TrendingUp, ChevronLeft, ChevronRight, Image as ImageIcon, BarChart3, DollarSign, Grid3X3, FileText, Truck, Sparkles } from "lucide-react";
import PreviewPageOne from "@/components/admin/import/preview/PreviewPageOne";
import PreviewPageThree from "@/components/admin/import/preview/PreviewPageThree";
import PreviewPageFour from "@/components/admin/import/preview/PreviewPageFour";
import PreviewPageFive from "@/components/admin/import/preview/PreviewPageFive";
import PreviewPageSix from "@/components/admin/import/preview/PreviewPageSix";
import PreviewPageSeven from "@/components/admin/import/preview/PreviewPageSeven";
import SmartImage from "@/components/smart-image";
import type { PricedProduct, PricedVariant } from "@/components/admin/import/preview/types";
import { sarToUsd } from "@/lib/pricing";
import { inferCjVideoQualityHint } from "@/lib/cj/video";
import { enhanceProductImageUrl } from "@/lib/media/image-quality";

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

type SupabaseCategory = {
  id: number;
  name: string;
  slug: string;
  level: number;
  parentId: number | null;
  children?: SupabaseCategory[];
};

type SelectedFeature = {
  cjCategoryId: string;
  cjCategoryName: string;
  supabaseCategoryId: number;
  supabaseCategorySlug: string;
};

type DiscoverMediaMode = "withVideo" | "imagesOnly" | "both";

type DiscoverSearchQuery = {
  categoryIds: string[];
  quantity: number;
  minPrice: number;
  maxPrice: number;
  minStock: number;
  profitMargin: number;
  popularity: string;
  minRating: string;
  shippingMethod: string;
  freeShippingOnly: boolean;
  mediaMode: DiscoverMediaMode;
};

type DiscoverSearchSession = {
  query: DiscoverSearchQuery;
  cursor: string;
  seenPids: string[];
  hasMore: boolean;
  batchNumber: number;
  consecutiveIdleBatches: number;
  consecutiveZeroProductBatches: number;
  lastError: string | null;
  lastShortfallReason: string | null;
};

const DISCOVER_NON_PRODUCT_IMAGE_RE = /(sprite|icon|favicon|logo|placeholder|blank|loading|badge|flag|promo|banner|sale|discount|qr|sizechart|size\s*chart|chart|table|guide|thumb|thumbnail|small|tiny|mini)/i;
const DISCOVER_IMAGE_KEY_SIZE_TOKEN_RE = /[_-](\d{2,4})x(\d{2,4})(?=\.)/gi;

function isValidDiscoverSearchCategoryId(value: unknown): boolean {
  const normalized = String(value || "").trim();
  if (!normalized) return false;

  const lower = normalized.toLowerCase();
  if (lower === "all") return true;
  if (lower.startsWith("supabase-")) return false;
  if (/^first-\d+$/i.test(lower)) return true;
  if (/^second-\d+-\d+$/i.test(lower)) return true;

  return /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(normalized);
}

function isValidDiscoverFeatureCategoryId(value: unknown): boolean {
  const normalized = String(value || "").trim();
  if (!isValidDiscoverSearchCategoryId(normalized)) return false;

  const lower = normalized.toLowerCase();
  return lower !== "all" && !lower.startsWith("first-") && !lower.startsWith("second-");
}

function normalizeDiscoverGalleryImageKey(url: string): string {
  const normalizedUrl = String(url || '').trim().toLowerCase();
  if (!normalizedUrl) return '';

  try {
    const parsed = new URL(normalizedUrl);
    parsed.search = '';
    parsed.hash = '';
    parsed.pathname = parsed.pathname.replace(DISCOVER_IMAGE_KEY_SIZE_TOKEN_RE, '');
    return parsed.toString();
  } catch {
    return normalizedUrl
      .replace(/[?#].*$/, '')
      .replace(DISCOVER_IMAGE_KEY_SIZE_TOKEN_RE, '');
  }
}

function isValidDiscoverGalleryImageUrl(url: string): boolean {
  const candidate = String(url || '').trim();
  if (!/^https?:\/\//i.test(candidate)) return false;
  if (DISCOVER_NON_PRODUCT_IMAGE_RE.test(candidate)) return false;
  return true;
}

function extractDiscoverDescriptionImages(html: string): string[] {
  if (!html) return [];

  const results: string[] = [];
  const seen = new Set<string>();
  const push = (raw: unknown) => {
    if (typeof raw !== 'string') return;
    const candidate = raw.replace(/&amp;/g, '&').trim();
    if (!isValidDiscoverGalleryImageUrl(candidate)) return;
    if (seen.has(candidate)) return;
    seen.add(candidate);
    results.push(candidate);
  };

  const imgTagRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = imgTagRegex.exec(html)) !== null) {
    push(match[1]);
  }

  const urlRegex = /https?:\/\/[^\s<>"']+\.(?:jpg|jpeg|png|gif|webp|avif|bmp)(?:\?[^\s<>"']*)?/gi;
  while ((match = urlRegex.exec(html)) !== null) {
    push(match[0]);
  }

  return results;
}

function buildDiscoverPreviewGallery(product: PricedProduct | null | undefined): string[] {
  if (!product) return [];

  const merged: string[] = [];
  const seen = new Set<string>();
  const pushImage = (raw: unknown) => {
    if (typeof raw !== 'string') return;
    const candidate = raw.replace(/&amp;/g, '&').trim();
    if (!isValidDiscoverGalleryImageUrl(candidate)) return;

    const enhancedCandidate = enhanceProductImageUrl(candidate, 'gallery');

    const key = normalizeDiscoverGalleryImageKey(enhancedCandidate);
    if (!key || seen.has(key)) return;

    seen.add(key);
    merged.push(enhancedCandidate);
  };

  for (const imageUrl of product.images || []) {
    pushImage(imageUrl);
  }

  // Search API already returns a deterministic, deduplicated gallery in product.images.
  // Only fall back to secondary sources when canonical images are missing.
  if (merged.length === 0) {
    const colorImageMap = product.colorImageMap;
    if (colorImageMap && typeof colorImageMap === 'object') {
      for (const imageUrl of Object.values(colorImageMap)) {
        pushImage(imageUrl);
      }
    }

    for (const variant of product.variants || []) {
      const vAny = variant as any;
      pushImage(vAny?.variantImage);
      pushImage(vAny?.whiteImage);
      pushImage(vAny?.image);
      pushImage(vAny?.imageUrl);
      pushImage(vAny?.imgUrl);
    }

    const descriptionImages = extractDiscoverDescriptionImages(String(product.description || ''));
    for (const imageUrl of descriptionImages) {
      pushImage(imageUrl);
    }
  }

  return merged;
}

export default function ProductDiscoveryPage() {
  const DISCOVER_PAGE_SIZE = 100;
  const INITIAL_DISCOVER_BATCH_SIZE = 3;
  const DISCOVER_BATCH_SIZE = 6;
  const MAX_IDLE_BATCHES = 12;
  const MAX_ZERO_PRODUCT_BATCHES = 10;
  const [category, setCategory] = useState("all");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectedFeaturesWithIds, setSelectedFeaturesWithIds] = useState<SelectedFeature[]>([]);
  const [supabaseCategories, setSupabaseCategories] = useState<SupabaseCategory[]>([]);
  const [quantity, setQuantity] = useState(50);
  const [minStock, setMinStock] = useState(0);
  const [maxPrice, setMaxPrice] = useState(100);
  const [minPrice, setMinPrice] = useState(0);
  const [profitMargin, setProfitMargin] = useState(8);
  const [popularity, setPopularity] = useState("any");
  const [minRating, setMinRating] = useState("any");
  // Use configured shipping allowlist and select the cheapest matched option per variant quote.
  const shippingMethod = "configured-cheapest";
  const [freeShippingOnly, setFreeShippingOnly] = useState(false);
  const [media, setMedia] = useState<DiscoverMediaMode>("both");
  
  const [loading, setLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [searchProgress, setSearchProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<PricedProduct[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [requestedQuantity, setRequestedQuantity] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionHasMore, setSessionHasMore] = useState(false);
  
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
  const TOTAL_PREVIEW_PAGES = 7;
  const searchSessionRef = useRef<DiscoverSearchSession | null>(null);
  const productsRef = useRef<PricedProduct[]>([]);
  const searchRunIdRef = useRef(0);

  const quantityPresets = [2000, 1500, 1000, 500, 250, 100, 50, 25, 10];
  const profitPresets = [100, 50, 25, 15, 8];
  

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

  const loadSupabaseCategories = async () => {
    try {
      const res = await fetch("/api/admin/categories/tree");
      const data = await res.json();
      if (data.ok && data.categories) {
        setSupabaseCategories(data.categories);
        console.log("[Discovery] Loaded", data.total, "Supabase categories");
      }
    } catch (e) {
      console.error("Failed to load Supabase categories:", e);
    }
  };

  useEffect(() => {
    testConnection();
    loadSupabaseCategories();
  }, []);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

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
        setFeatures((prev: FeatureOption[]) => {
          const filtered = prev.filter((f: FeatureOption) => f.parentId !== categoryId);
          return [...filtered, ...newFeatures];
        });
      }
    } catch (e) {
      console.error("Failed to load features:", e);
    }
  };

  const fetchUntilCount = async (
    targetCount: number,
    options: { mode: "initial" | "page"; runId: number }
  ): Promise<void> => {
    const session = searchSessionRef.current;
    if (!session) return;

    const clampedTarget = Math.max(0, Math.min(targetCount, session.query.quantity));
    if (clampedTarget === 0) return;
    if (productsRef.current.length >= clampedTarget) return;
    if (!session.hasMore) return;

    if (options.mode === "page") {
      setIsPageLoading(true);
    }

    let workingProducts = [...productsRef.current];
    const knownPids = new Set(workingProducts.map((product) => product.pid));
    const maxBatchIterations = Math.max(1000, session.query.quantity);

    try {
      while (session.hasMore && workingProducts.length < clampedTarget) {
        if (options.runId !== searchRunIdRef.current) {
          break;
        }

        const cursorBeforeBatch = session.cursor;
        session.batchNumber += 1;
        const remainingNeeded = Math.max(0, session.query.quantity - workingProducts.length);
        if (remainingNeeded === 0) break;
        const requestBatchSize = workingProducts.length === 0
          ? INITIAL_DISCOVER_BATCH_SIZE
          : DISCOVER_BATCH_SIZE;

        setSearchProgress(
          `Finding products... (batch ${session.batchNumber}, found ${workingProducts.length}/${session.query.quantity})`
        );

        const params = new URLSearchParams({
          categoryIds: session.query.categoryIds.join(","),
          quantity: session.query.quantity.toString(),
          minPrice: session.query.minPrice.toString(),
          maxPrice: session.query.maxPrice.toString(),
          minStock: session.query.minStock.toString(),
          profitMargin: session.query.profitMargin.toString(),
          popularity: session.query.popularity,
          minRating: session.query.minRating,
          shippingMethod: session.query.shippingMethod,
          freeShippingOnly: session.query.freeShippingOnly ? "1" : "0",
          mediaMode: session.query.mediaMode,
          batchMode: "1",
          batchSize: requestBatchSize.toString(),
          cursor: session.cursor,
          remainingNeeded: remainingNeeded.toString(),
        });

        const res = await fetch(`/api/admin/cj/products/search-and-price?${params}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seenPids: session.seenPids }),
        });

        const contentType = res.headers.get("content-type") || "";
        const rawBody = await res.text();
        let data: any;
        try {
          data = rawBody ? JSON.parse(rawBody) : null;
        } catch {
          const compactBody = rawBody.replace(/\s+/g, " ").trim();
          const snippet = compactBody ? compactBody.slice(0, 160) : "Empty response body";
          throw new Error(
            `Search API returned invalid JSON (${res.status}${contentType ? `, ${contentType}` : ""}): ${snippet}`
          );
        }

        if (!data || typeof data !== "object") {
          throw new Error(`Search API returned an invalid response (${res.status}).`);
        }

        if (!res.ok || !data.ok) {
          if (data.quotaExhausted || res.status === 429) {
            session.lastError = "CJ Dropshipping API limit reached. Showing products found so far.";
            session.hasMore = false;
            break;
          }
          throw new Error(data.error || `Search failed: ${res.status}`);
        }

        const batchProducts: PricedProduct[] = Array.isArray(data.products) ? data.products : [];
        const incomingShortfallReason =
          typeof data.shortfallReason === "string" && data.shortfallReason.trim()
            ? data.shortfallReason.trim()
            : null;

        let addedInBatch = 0;
        for (const product of batchProducts) {
          if (!product?.pid) continue;
          if (workingProducts.length >= session.query.quantity) break;
          if (knownPids.has(product.pid)) continue;

          knownPids.add(product.pid);
          workingProducts.push(product);
          addedInBatch += 1;
        }

        if (addedInBatch > 0) {
          productsRef.current = [...workingProducts];
          setProducts([...workingProducts]);
        }

        if (data.batch) {
          session.hasMore = Boolean(data.batch.hasMore);
          if (typeof data.batch.cursor === "string" && data.batch.cursor.trim()) {
            session.cursor = data.batch.cursor;
          }
          if (Array.isArray(data.batch.attemptedPids) && data.batch.attemptedPids.length > 0) {
            const mergedSeen = new Set<string>([
              ...session.seenPids,
              ...data.batch.attemptedPids.map((pid: unknown) => String(pid)),
            ]);
            session.seenPids = Array.from(mergedSeen);
          }
        } else {
          session.hasMore = false;
        }

        if (incomingShortfallReason) {
          session.lastShortfallReason = incomingShortfallReason;
        } else if (session.hasMore || workingProducts.length >= session.query.quantity) {
          session.lastShortfallReason = null;
        }

        if (addedInBatch === 0) {
          session.consecutiveZeroProductBatches += 1;
        } else {
          session.consecutiveZeroProductBatches = 0;
        }

        const attemptedCount = Array.isArray(data.batch?.attemptedPids)
          ? data.batch.attemptedPids.length
          : 0;

        const cursorAdvanced = session.cursor !== cursorBeforeBatch;
        const madeProgress = addedInBatch > 0 || attemptedCount > 0 || cursorAdvanced;

        if (!madeProgress) {
          session.consecutiveIdleBatches += 1;
        } else {
          session.consecutiveIdleBatches = 0;
        }

        if (!session.hasMore) {
          break;
        }

        if (session.consecutiveZeroProductBatches >= MAX_ZERO_PRODUCT_BATCHES) {
          session.lastError = workingProducts.length === 0
            ? "Search returned no displayable products after multiple batches. Try adjusting filters and retry."
            : "Search stopped after multiple batches with no new products. Showing products found so far.";
          session.hasMore = false;
          break;
        }

        if (session.consecutiveIdleBatches >= MAX_IDLE_BATCHES) {
          session.lastError = "Search stopped after repeated idle batches. Try refining filters or retrying.";
          session.hasMore = false;
          break;
        }

        if (session.batchNumber >= maxBatchIterations) {
          session.lastError = "Search safety limit reached. Showing products found so far.";
          session.hasMore = false;
          break;
        }

        setSessionHasMore(session.hasMore);
      }
    } catch (e: any) {
      session.lastError = e?.message || "Search failed";
      if (workingProducts.length > 0) {
        setError(`Notice: ${session.lastError}`);
      } else {
        setError(session.lastError);
      }
    } finally {
      if (options.mode === "page") {
        setIsPageLoading(false);
      }

      if (options.runId === searchRunIdRef.current) {
        productsRef.current = [...workingProducts];
        setProducts([...workingProducts]);
        setSessionHasMore(session.hasMore);
      }

      setSearchProgress("");
    }
  };

  const getShortfallNotice = (session: DiscoverSearchSession | null, foundCount: number): string | null => {
    if (!session) return null;
    if (foundCount >= session.query.quantity) return null;
    if (session.lastError) return session.lastError;
    if (session.lastShortfallReason && !session.hasMore) return session.lastShortfallReason;
    if (!session.hasMore) {
      return `Found ${foundCount}/${session.query.quantity} products. Not enough matching products in this category.`;
    }
    return null;
  };

  const searchProducts = async () => {
    const validFeatureCategoryIds = selectedFeatures.filter((featureId: string) =>
      isValidDiscoverFeatureCategoryId(featureId)
    );
    const fallbackCategoryId =
      category !== "all" && isValidDiscoverSearchCategoryId(category) ? category : null;
    const categoryIds = validFeatureCategoryIds.length > 0
      ? validFeatureCategoryIds
      : (fallbackCategoryId ? [fallbackCategoryId] : []);

    if (categoryIds.length === 0) {
      setError("Please select a category or a CJ-mapped feature to search");
      return;
    }

    if (selectedFeatures.length > 0 && validFeatureCategoryIds.length === 0 && fallbackCategoryId) {
      console.warn(
        `[Discovery] Selected features are not CJ-mapped. Falling back to parent category ${fallbackCategoryId}.`
      );
    }

    const requestedCount = Math.max(1, Math.floor(Number(quantity) || 0));

    const session: DiscoverSearchSession = {
      query: {
        categoryIds,
        quantity: requestedCount,
        minPrice,
        maxPrice,
        minStock,
        profitMargin,
        popularity,
        minRating,
        shippingMethod,
        freeShippingOnly,
        mediaMode: media,
      },
      cursor: "0.1.0",
      seenPids: [],
      hasMore: true,
      batchNumber: 0,
      consecutiveIdleBatches: 0,
      consecutiveZeroProductBatches: 0,
      lastError: null,
      lastShortfallReason: null,
    };

    const runId = searchRunIdRef.current + 1;
    searchRunIdRef.current = runId;
    searchSessionRef.current = session;

    setLoading(true);
    setIsPageLoading(false);
    setError(null);
    setProducts([]);
    productsRef.current = [];
    setSelected(new Set());
    setSavedBatchId(null);
    setCurrentPage(1);
    setRequestedQuantity(requestedCount);
    setSessionHasMore(true);

    try {
      await fetchUntilCount(Math.min(DISCOVER_PAGE_SIZE, requestedCount), { mode: "initial", runId });

      if (runId !== searchRunIdRef.current) return;

      const foundCount = productsRef.current.length;
      const shortfallNotice = getShortfallNotice(searchSessionRef.current, foundCount);
      if (shortfallNotice) {
        setError(`Notice: ${shortfallNotice}`);
      }
      if (foundCount === 0 && !shortfallNotice) {
        setError("No products were returned for the selected filters. Try a different category or relax filters.");
      }
    } finally {
      if (runId === searchRunIdRef.current) {
        setLoading(false);
        setSearchProgress("");
      }
    }
  };

  const toggleSelect = (productId: string, e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setSelected((prev: Set<string>) => {
      const next = new Set<string>(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const selectCurrentPage = (): void => {
    const start = Math.max(0, (currentPage - 1) * DISCOVER_PAGE_SIZE);
    const pageProducts = products.slice(start, start + DISCOVER_PAGE_SIZE);
    setSelected((prev) => {
      const next = new Set(prev);
      for (const product of pageProducts) {
        next.add(product.pid);
      }
      return next;
    });
  };

  const selectAllLoaded = (): void => {
    setSelected(new Set<string>(products.map((p: PricedProduct) => p.pid)));
  };

  const deselectAll = (): void => {
    setSelected(new Set());
  };

  const ensurePageLoaded = async (pageNumber: number): Promise<void> => {
    const session = searchSessionRef.current;
    if (!session) return;
    if (!session.hasMore) return;

    const runId = searchRunIdRef.current;
    const targetCount = Math.min(session.query.quantity, pageNumber * DISCOVER_PAGE_SIZE);
    if (productsRef.current.length >= targetCount) return;

    await fetchUntilCount(targetCount, { mode: "page", runId });

    const shortfallNotice = getShortfallNotice(searchSessionRef.current, productsRef.current.length);
    if (shortfallNotice) {
      setError(`Notice: ${shortfallNotice}`);
    }
  };

  const handleDiscoverPageChange = async (nextPage: number): Promise<void> => {
    if (loading || isPageLoading) return;

    const totalRequestedPages = Math.max(1, Math.ceil(Math.max(requestedQuantity, 1) / DISCOVER_PAGE_SIZE));
    const clampedPage = Math.max(1, Math.min(nextPage, totalRequestedPages));

    setCurrentPage(clampedPage);
    await ensurePageLoaded(clampedPage);
  };

  const removeProduct = (productId: string, e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setProducts((prev: PricedProduct[]) => {
      const next = prev.filter((p: PricedProduct) => p.pid !== productId);
      productsRef.current = next;
      return next;
    });
    setSelected((prev: Set<string>) => {
      const next = new Set<string>(prev);
      next.delete(productId);
      return next;
    });
  };

  const openPreview = (product: PricedProduct, e: ReactMouseEvent<HTMLButtonElement>) => {
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
      case 1: return "Overview";
      case 2: return "Product Gallery";
      case 3: return "Specifications";
      case 4: return "Stock & Popularity";
      case 5: return "Shipping & Delivery";
      case 6: return "Price Details";
      case 7: return "AI Media";
      default: return "Product Preview";
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
      case 7: return <Sparkles className="h-4 w-4" />;
      default: return null;
    }
  };

  const previewGalleryImages = useMemo(() => {
    return buildDiscoverPreviewGallery(previewProduct);
  }, [previewProduct]);

  const previewVideoUrl = useMemo(() => {
    const candidate = typeof previewProduct?.videoUrl === "string" ? previewProduct.videoUrl.trim() : "";
    return candidate;
  }, [previewProduct]);

  const previewVideoQualityHint = useMemo(() => {
    return previewVideoUrl ? inferCjVideoQualityHint(previewVideoUrl) : "unknown";
  }, [previewVideoUrl]);

  const saveBatch = async () => {
    if (selected.size === 0) return;
    
    setSaving(true);
    try {
      const selectedProducts = products.filter((p: PricedProduct) => selected.has(p.pid));
      const res = await fetch("/api/admin/import/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: batchName || `Discovery ${new Date().toLocaleDateString()}`,
          mediaMode: media,
          category: category !== 'all' ? categories.find((c: Category) => c.categoryId === category)?.categoryName : undefined,
          products: selectedProducts.map((p: PricedProduct) => {
            const pricedVariants = p.variants.filter((v: PricedVariant) => {
              const sell = Number((v as any)?.sellPriceSAR);
              return Number.isFinite(sell) && sell > 0;
            });

            const htmlToPlain = (value: unknown): string => {
              return String(value ?? '')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n')
                .replace(/<[^>]+>/g, ' ')
                .replace(/&nbsp;/gi, ' ')
                .replace(/&amp;/gi, '&')
                .replace(/\r/g, '')
                .replace(/[ \t]+/g, ' ')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            };

            const htmlToLines = (value: unknown): string[] => {
              return htmlToPlain(value)
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean);
            };

            const sourceSpecs = (p as any).specifications && typeof (p as any).specifications === 'object'
              ? (p as any).specifications
              : {};
            const plainSpecifications: Record<string, string> = {};
            const blockedSpecKeys = new Set([
              'productinfo',
              'sizeinfo',
              'overview',
              'productnote',
              'packinglist',
              'description',
            ]);

            for (const [key, rawValue] of Object.entries(sourceSpecs)) {
              const keyText = String(key || '').trim();
              if (!keyText) continue;
              const normalizedKey = keyText.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (blockedSpecKeys.has(normalizedKey)) continue;
              const cleanValue = htmlToPlain(rawValue);
              if (!cleanValue) continue;
              plainSpecifications[keyText] = cleanValue.slice(0, 500);
            }

            if (p.material && !plainSpecifications.Material) {
              plainSpecifications.Material = htmlToPlain(p.material);
            }
            if (p.productType && !plainSpecifications['Product Type']) {
              plainSpecifications['Product Type'] = htmlToPlain(p.productType);
            }

            const sourceSellingPoints = Array.isArray((p as any).sellingPoints)
              ? (p as any).sellingPoints.map((s: unknown) => htmlToPlain(s)).filter(Boolean)
              : [];
            const normalizedSellingPoints = sourceSellingPoints.length > 0
              ? sourceSellingPoints
              : htmlToLines(p.overview).slice(0, 8);
            const appliedMargin = Number((p as any).profitMarginApplied ?? profitMargin);
            const mergedGalleryImages = buildDiscoverPreviewGallery(p);
            const supplierRatingRaw = Number((p as any).rating);
            const reviewCountRaw = Number((p as any).reviewCount);
            const displayedRatingRaw = Number((p as any).displayedRating);
            const ratingConfidenceRaw = Number((p as any).ratingConfidence);
            const supplierRating = Number.isFinite(supplierRatingRaw) && supplierRatingRaw > 0
              ? supplierRatingRaw
              : undefined;
            const reviewCount = Number.isFinite(reviewCountRaw) && reviewCountRaw >= 0
              ? Math.floor(reviewCountRaw)
              : undefined;
            const displayedRating = Number.isFinite(displayedRatingRaw) && displayedRatingRaw > 0
              ? displayedRatingRaw
              : undefined;
            const ratingConfidence = Number.isFinite(ratingConfidenceRaw) && ratingConfidenceRaw > 0
              ? ratingConfidenceRaw
              : undefined;
            
            return {
              cjProductId: p.pid,
              cjSku: p.cjSku,
              storeSku: p.storeSku,
              name: p.name,
              description: p.description,
              overview: p.overview,
              productInfo: p.productInfo,
              sizeInfo: p.sizeInfo,
              productNote: p.productNote,
              packingList: p.packingList,
              images: mergedGalleryImages,
              videoUrl: p.videoUrl,
              videoSourceUrl: p.videoSourceUrl,
              video4kUrl: p.video4kUrl,
              videoDeliveryMode: p.videoDeliveryMode,
              videoQualityGatePassed: p.videoQualityGatePassed,
              videoSourceQualityHint: p.videoSourceQualityHint,
              mediaMode: media,
              minPriceSAR: p.minPriceSAR,
              maxPriceSAR: p.maxPriceSAR,
              avgPriceSAR: p.avgPriceSAR,
              minPriceUSD: (p as any).minPriceUSD,
              maxPriceUSD: (p as any).maxPriceUSD,
              avgPriceUSD: (p as any).avgPriceUSD,
              stock: p.stock,
              variants: p.variants,
              supplierRating,
              reviewCount,
              categoryName: p.categoryName,
              cjCategoryId: category !== 'all' ? category : undefined,
              supabaseCategoryId: selectedFeaturesWithIds.length > 0 ? selectedFeaturesWithIds[0].supabaseCategoryId : undefined,
              supabaseCategorySlug: selectedFeaturesWithIds.length > 0 ? selectedFeaturesWithIds[0].supabaseCategorySlug : undefined,
              displayedRating,
              ratingConfidence,
              productWeight: p.productWeight,
              packLength: p.packLength,
              packWidth: p.packWidth,
              packHeight: p.packHeight,
              material: p.material,
              productType: p.productType,
              originCountry: p.originCountry,
              hsCode: p.hsCode,
              sizeChartImages: p.sizeChartImages,
              availableSizes: p.availableSizes,
              availableColors: p.availableColors,
              availableModels: p.availableModels,
              processingDays: p.processingTimeHours,
              deliveryDaysMin: undefined,
              deliveryDaysMax: p.deliveryTimeHours,
              variantPricing: pricedVariants.map(v => {
                const sellPriceSar = Number((v as any).sellPriceSAR || 0);
                const sellPriceUsdFromVariant = Number((v as any).sellPriceUSD);
                const sellPriceUsd = Number.isFinite(sellPriceUsdFromVariant) && sellPriceUsdFromVariant > 0
                  ? sellPriceUsdFromVariant
                  : (sellPriceSar > 0 ? sarToUsd(sellPriceSar) : 0);
                const variantMarginPercent = Number((v as any).marginPercent);

                return {
                  variantId: v.variantId,
                  sku: v.variantSku,
                  color: v.color,
                  size: v.size,
                  price: sellPriceSar,
                  priceUsd: sellPriceUsd > 0 ? sellPriceUsd : null,
                  marginPercent: Number.isFinite(variantMarginPercent)
                    ? variantMarginPercent
                    : (Number.isFinite(appliedMargin) ? appliedMargin : null),
                  costPrice: v.variantPriceUSD,
                  shippingCost: v.shippingPriceUSD,
                  stock: v.stock ?? null,
                  cjStock: v.cjStock ?? null,
                  factoryStock: v.factoryStock ?? null,
                  colorImage: v.variantImage,
                };
              }),
              specifications: plainSpecifications,
              sellingPoints: normalizedSellingPoints,
              inventoryByWarehouse: p.inventory,
              inventoryStatus: p.inventoryStatus,
              inventoryErrorMessage: p.inventoryErrorMessage,
              colorImageMap: p.colorImageMap,
              priceBreakdown: undefined,
              cjProductCost: undefined,
              cjShippingCost: undefined,
              cjTotalCost: undefined,
              profitMargin: Number.isFinite(appliedMargin) && appliedMargin > 0 ? appliedMargin : undefined,
            };
          }),
        }),
      });
      
      const data = await res.json();
      if (data.ok && data.batchId) {
        setSavedBatchId(data.batchId);
        const skippedNotices: string[] = [];
        if (typeof data.productsSkippedMissingVideo === 'number' && data.productsSkippedMissingVideo > 0) {
          skippedNotices.push(
            `${data.productsSkippedMissingVideo} selected products were skipped because video mode requires video.`
          );
        }
        if (typeof data.productsSkippedVideoQualityGate === 'number' && data.productsSkippedVideoQualityGate > 0) {
          skippedNotices.push(
            `${data.productsSkippedVideoQualityGate} selected products were skipped because strict 4K quality gate failed.`
          );
        }
        if (skippedNotices.length > 0) {
          setError(`Notice: ${skippedNotices.join(' ')}`);
        }
      } else {
        throw new Error(data.error || "Failed to save batch");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to save batch");
    } finally {
      setSaving(false);
    }
  };

  const findMatchingSupabaseCategory = (cjCategoryName: string): SupabaseCategory | null => {
    const normalizedName = cjCategoryName.toLowerCase().trim();
    
    for (const main of supabaseCategories) {
      if (main.children) {
        for (const group of main.children) {
          if (group.children) {
            for (const item of group.children) {
              const itemName = item.name.toLowerCase().trim();
              if (itemName === normalizedName || 
                  item.slug === normalizedName.replace(/[^a-z0-9]+/g, '-')) {
                return item;
              }
            }
          }
          const groupName = group.name.toLowerCase().trim();
          if (groupName === normalizedName) {
            return group;
          }
        }
      }
      const mainName = main.name.toLowerCase().trim();
      if (mainName === normalizedName) {
        return main;
      }
    }
    return null;
  };

  const toggleFeature = (featureId: string) => {
    const isRemoving = selectedFeatures.includes(featureId);
    
    setSelectedFeatures((prev: string[]) => {
      if (prev.includes(featureId)) {
        return prev.filter((f: string) => f !== featureId);
      } else {
        return [...prev, featureId];
      }
    });
    
    // Always sync selectedFeaturesWithIds - remove if already selected
    if (isRemoving) {
      setSelectedFeaturesWithIds((prev: SelectedFeature[]) => prev.filter((sf: SelectedFeature) => sf.cjCategoryId !== featureId));
      return; // Exit early on removal
    }
    
    // Adding new feature - try to find matching Supabase category
    const feature = features.find((f: FeatureOption) => f.id === featureId);
    if (feature) {
      const matchingSupabase = findMatchingSupabaseCategory(feature.name);
      const newFeature: SelectedFeature = {
        cjCategoryId: featureId,
        cjCategoryName: feature.name,
        supabaseCategoryId: matchingSupabase?.id || 0,
        supabaseCategorySlug: matchingSupabase?.slug || '',
      };
      setSelectedFeaturesWithIds((prev: SelectedFeature[]) => [...prev, newFeature]);
      if (matchingSupabase) {
        console.log(`[Discovery] Matched CJ "${feature.name}" to Supabase category ${matchingSupabase.id} (${matchingSupabase.slug})`);
      } else {
        console.warn(`[Discovery] No Supabase match found for CJ category "${feature.name}"`);
      }
    }
  };

  const getFeatureName = (id: string) => {
    const feature = features.find((f: FeatureOption) => f.id === id);
    return feature?.name || id;
  };

  const getCategoryChildren = (parentId: string) => {
    return features.filter((f: FeatureOption) => f.parentId === parentId);
  };

  useEffect(() => {
    const requestedPages = Math.max(1, Math.ceil(Math.max(requestedQuantity, 1) / DISCOVER_PAGE_SIZE));
    const loadedPages = Math.max(1, Math.ceil(Math.max(products.length, 1) / DISCOVER_PAGE_SIZE));
    const maxPage = sessionHasMore ? requestedPages : loadedPages;
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [currentPage, products.length, requestedQuantity, sessionHasMore]);

  const selectedCategory = categories.find((c: Category) => c.categoryId === category);

  const totalRequestedPages = Math.max(1, Math.ceil(Math.max(requestedQuantity, 1) / DISCOVER_PAGE_SIZE));
  const totalLoadedPages = Math.max(1, Math.ceil(Math.max(products.length, 1) / DISCOVER_PAGE_SIZE));
  const totalDiscoverPages = sessionHasMore ? totalRequestedPages : totalLoadedPages;
  const clampedCurrentPage = Math.min(currentPage, totalDiscoverPages);
  const pageStartIndex = (clampedCurrentPage - 1) * DISCOVER_PAGE_SIZE;
  const displayedProducts = products.slice(pageStartIndex, pageStartIndex + DISCOVER_PAGE_SIZE);
  const pageFirstItemNumber = products.length > 0 ? pageStartIndex + 1 : 0;
  const pageLastItemNumber = products.length > 0 ? pageStartIndex + displayedProducts.length : 0;
  
  // Find matching Supabase main category based on CJ category name
  const getMatchingSupabaseMainCategory = (): SupabaseCategory | null => {
    if (!selectedCategory || category === 'all') return null;
    
    const cjName = selectedCategory.categoryName.toLowerCase();
    return supabaseCategories.find((sc: SupabaseCategory) => {
      const scName = sc.name.toLowerCase();
      const scSlug = sc.slug.toLowerCase();
      return scName === cjName || 
             scSlug === cjName.replace(/[^a-z0-9]+/g, '-') ||
             scName.includes(cjName) ||
             cjName.includes(scName);
    }) || null;
  };
  
  const matchingSupabaseCategory = getMatchingSupabaseMainCategory();

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
                setSelectedFeaturesWithIds([]); // Clear Supabase category tracking when category changes
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
                  if (e.target.value) {
                    // Parse the value: "cjId:supabaseId:name"
                    const [cjId, supabaseId, ...nameParts] = e.target.value.split(':');
                    const name = nameParts.join(':');
                    const normalizedCjId = String(cjId || "").trim();

                    if (!isValidDiscoverFeatureCategoryId(normalizedCjId)) {
                      console.warn(
                        `[Discovery] Ignored feature with no CJ category mapping: ${name} (${normalizedCjId || 'unmapped'})`
                      );
                      e.target.value = "";
                      return;
                    }
                    
                    // Toggle the CJ feature ID
                    toggleFeature(normalizedCjId);
                    
                    // Track the Supabase category ID if available
                    if (supabaseId && parseInt(supabaseId) > 0) {
                      const existing = selectedFeaturesWithIds.find((sf: SelectedFeature) => sf.cjCategoryId === normalizedCjId);
                      if (!existing) {
                        setSelectedFeaturesWithIds((prev: SelectedFeature[]) => [...prev, {
                          cjCategoryId: normalizedCjId,
                          cjCategoryName: name,
                          supabaseCategoryId: parseInt(supabaseId),
                          supabaseCategorySlug: '',
                        }]);
                        console.log(`[Discovery] Selected Feature: ${name} (CJ: ${cjId}, Supabase: ${supabaseId})`);
                      }
                    }
                  }
                  e.target.value = "";
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded appearance-none"
              >
                <option value="">Select features...</option>
                {/* Use Supabase categories if available for better organization */}
                {matchingSupabaseCategory?.children?.map(group => (
                  <optgroup key={group.id} label={group.name}>
                    {group.children?.map(item => {
                      // Find matching CJ category by name for the CJ search
                      const matchingCjCat = selectedCategory?.children
                        ?.flatMap(c => c.children || [])
                        ?.find(cj => cj?.categoryName?.toLowerCase() === item.name.toLowerCase());
                      const cjId = matchingCjCat?.categoryId ? String(matchingCjCat.categoryId) : "";
                      const hasValidCjMapping = isValidDiscoverFeatureCategoryId(cjId);
                      const optionValue = hasValidCjMapping
                        ? `${cjId}:${item.id}:${item.name}`
                        : `unmapped:${item.id}:${item.name}`;
                      const optionDisabled = !hasValidCjMapping || selectedFeatures.includes(cjId);
                      
                      return (
                        <option 
                          key={item.id} 
                          value={optionValue}
                          disabled={optionDisabled}
                        >
                          {item.name}{hasValidCjMapping ? "" : " (No CJ match)"}
                        </option>
                      );
                    })}
                  </optgroup>
                ))}
                {/* Fallback to CJ categories if no Supabase match */}
                {!matchingSupabaseCategory && selectedCategory?.children?.map(child => (
                  <optgroup key={child.categoryId} label={child.categoryName}>
                    {child.children?.map(subChild => (
                      <option 
                        key={subChild.categoryId} 
                        value={`${subChild.categoryId}:0:${subChild.categoryName}`}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
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

          <div>
            <label className="block text-sm text-gray-600 mb-2">Media Filter</label>
            <select
              value={media}
              onChange={(e) => setMedia(e.target.value as "withVideo" | "imagesOnly" | "both")}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="withVideo">With video</option>
              <option value="imagesOnly">Images only</option>
              <option value="both">Both (video + images)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-2 flex items-center gap-1">
              <Truck className="h-4 w-4 text-blue-500" />
              Shipping Method
            </label>
            <div className="w-full px-3 py-2 border border-blue-300 rounded bg-blue-50 text-blue-800 font-medium">
              Configured allowlist (auto-choose cheapest available)
            </div>
            <p className="text-xs text-gray-500 mt-1">
              LuWei Ordinary US, CJPacket Ordinary, YunExpress Ordinary, YunExpress Sensitive, CJPacket Sensitive, GOFO+, UniUni+, GOFO GC parcel+
            </p>
          </div>
          
        </div>
        

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
            Set your desired profit margin. Products display final USD sell prices from priced variants using this applied margin.
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
            disabled={loading || isPageLoading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Search Products
          </button>
        </div>
      </div>

      {(loading || isPageLoading) && searchProgress && (
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
            Searching products, calculating shipping costs, and applying {profitMargin}% profit margin. Final USD sell prices (with applied margin) will be added to the checklist exactly as shown.
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
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-900">
                Loaded <strong>{products.length}</strong> / <strong>{requestedQuantity}</strong> requested
              </span>
              <span className="text-sm text-gray-400">|</span>
              <span className="text-sm text-gray-600">
                Showing <strong>{displayedProducts.length}</strong> on this page
              </span>
              <span className="text-sm text-gray-400">|</span>
              <span className="text-sm text-gray-600">
                <strong>{selected.size}</strong> selected
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={selectCurrentPage} className="text-sm text-blue-600 hover:underline">Select Page</button>
              <button onClick={selectAllLoaded} className="text-sm text-blue-600 hover:underline">Select Loaded</button>
              <button onClick={deselectAll} className="text-sm text-gray-500 hover:underline">Clear</button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg p-3">
            <p className="text-sm text-gray-600">
              Page <strong>{clampedCurrentPage}</strong> of <strong>{totalDiscoverPages}</strong>
              {" · "}
              Showing <strong>{pageFirstItemNumber}</strong>-<strong>{pageLastItemNumber}</strong> of <strong>{products.length}</strong> loaded products
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => { void handleDiscoverPageChange(clampedCurrentPage - 1); }}
                disabled={clampedCurrentPage <= 1 || loading || isPageLoading}
                className="p-1.5 border rounded hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <select
                value={clampedCurrentPage}
                onChange={(e) => { void handleDiscoverPageChange(Number(e.target.value)); }}
                disabled={loading || isPageLoading}
                className="h-9 rounded border border-gray-300 px-2 text-sm"
              >
                {Array.from({ length: totalDiscoverPages }, (_, index) => index + 1).map((pageNumber) => (
                  <option key={pageNumber} value={pageNumber}>
                    Page {pageNumber}
                  </option>
                ))}
              </select>

              <button
                onClick={() => { void handleDiscoverPageChange(clampedCurrentPage + 1); }}
                disabled={clampedCurrentPage >= totalDiscoverPages || loading || isPageLoading}
                className="p-1.5 border rounded hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {isPageLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayedProducts.map((product) => {
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
                      <SmartImage
                        src={enhanceProductImageUrl(product.images[0], "gallery")}
                        alt={product.name}
                        fill
                        quality={95}
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Package className="h-12 w-12" />
                      </div>
                    )}
                    {(product as any).videoUrl && (
                      <div className="absolute left-2 bottom-2 rounded-full bg-black/60 text-white px-2 py-1 text-[11px] flex items-center gap-1">
                        <Play className="h-3.5 w-3.5" />
                        <span>Video</span>
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
                        <span className="text-xs text-gray-600">Sell Price (USD)</span>
                        <span className="font-bold text-green-700 text-lg">
                          {(() => {
                            const directMinUsd = Number((product as any).minPriceUSD);
                            const directMaxUsd = Number((product as any).maxPriceUSD);
                            const fallbackMinUsd = Number(product.minPriceSAR) > 0
                              ? sarToUsd(Number(product.minPriceSAR))
                              : NaN;
                            const fallbackMaxUsd = Number(product.maxPriceSAR) > 0
                              ? sarToUsd(Number(product.maxPriceSAR))
                              : NaN;

                            const minUsd = Number.isFinite(directMinUsd) && directMinUsd > 0 ? directMinUsd : fallbackMinUsd;
                            const maxUsd = Number.isFinite(directMaxUsd) && directMaxUsd > 0 ? directMaxUsd : fallbackMaxUsd;

                            if (Number.isFinite(minUsd) && minUsd > 0) {
                              if (Number.isFinite(maxUsd) && maxUsd > minUsd) {
                                return `$${minUsd.toFixed(2)} - $${maxUsd.toFixed(2)}`;
                              }
                              return `$${minUsd.toFixed(2)}`;
                            }
                            return "$-";
                          })()}
                        </span>
                      </div>
                      {(() => {
                        const appliedMargin = Number((product as any).profitMarginApplied ?? profitMargin);
                        if (!Number.isFinite(appliedMargin) || appliedMargin <= 0) return null;
                        return (
                          <p className="text-[11px] text-emerald-700 mt-1">
                            Applied margin: {appliedMargin.toFixed(0)}%
                          </p>
                        );
                      })()}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex flex-col">
                        <span className="text-gray-500">Stock</span>
                        <span className={`font-semibold ${(product.stock ?? 0) > 0 ? "text-gray-900" : "text-red-500"}`}>
                          {product.stock ?? "-"}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500">Variants</span>
                        <span className="font-semibold text-gray-900">
                          {product.successfulVariants}/{product.totalVariants}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t pt-2 text-xs">
                      <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {(() => {
                          const ratingNum = Number((product as any).displayedRating ?? (product as any).rating);
                          return Number.isFinite(ratingNum) && ratingNum > 0 ? ratingNum.toFixed(1) : "-";
                        })()}
                      </span>
                      <span className="text-gray-600">
                        {(() => {
                          const reviewCountNum = Number((product as any).reviewCount);
                          const normalizedCount = Number.isFinite(reviewCountNum) && reviewCountNum > 0
                            ? Math.floor(reviewCountNum)
                            : 0;
                          return `${normalizedCount.toLocaleString('en-US')} Reviewed`;
                        })()}
                      </span>
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
              
              {/* Page 2: Product Gallery */}
              {previewPage === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">
                      Product Gallery ({previewGalleryImages.length} images{previewVideoUrl ? " + video" : ""})
                    </h4>
                  </div>

                  {previewVideoUrl && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <h5 className="text-sm font-medium text-blue-900">Product Video</h5>
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                          {previewVideoQualityHint === '4k'
                            ? '4K source hint'
                            : previewVideoQualityHint === 'hd'
                              ? 'HD source hint'
                              : previewVideoQualityHint === 'sd'
                                ? 'SD source hint'
                                : 'Quality unknown'}
                        </span>
                      </div>
                      <div className="aspect-video overflow-hidden rounded bg-black">
                        <video
                          src={previewVideoUrl}
                          controls
                          playsInline
                          preload="metadata"
                          className="h-full w-full object-contain"
                        />
                      </div>
                    </div>
                  )}
                  
                  {previewGalleryImages.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {previewGalleryImages.map((img, index) => (
                        <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group">
                          <SmartImage 
                            src={enhanceProductImageUrl(img, "gallery")}
                            alt={`${previewProduct.name} - Image ${index + 1}`}
                            fill
                            quality={95}
                            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
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

              {/* Page 7: AI Media */}
              {previewPage === 7 && (
                <PreviewPageSeven
                  product={previewProduct}
                  sourceContext="discover"
                />
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
