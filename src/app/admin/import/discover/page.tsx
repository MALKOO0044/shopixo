"use client";







import { useState, useEffect, useMemo, useRef, type ChangeEvent as ReactChangeEvent, type MouseEvent as ReactMouseEvent } from "react";



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



import { normalizeCjProductId } from "@/lib/import/normalization";







type Category = {



  categoryId: string;



  categoryName: string;



  children?: Category[];



};



type DiscoverExistingProductPolicy = "excludeQueueAndStore" | "excludeQueueOnly" | "excludeNone";

type DiscoverProfile = "full" | "fast";



type DiscoverPageSelectionParseResult = {



  pages: number[];



  invalidTokens: string[];



};







function parseDiscoverPageSelectionInput(rawValue: string, maxPage: number): DiscoverPageSelectionParseResult {



  const pages = new Set<number>();



  const invalidTokens: string[] = [];







  const tokens = String(rawValue || "")



    .split(",")



    .map((token) => token.trim())



    .filter(Boolean);







  for (const token of tokens) {



    const normalized = token.replace(/\s+/g, "");







    if (/^\d+$/.test(normalized)) {



      const pageNum = Number(normalized);



      if (Number.isInteger(pageNum) && pageNum >= 1 && pageNum <= maxPage) {



        pages.add(pageNum);



      } else {



        invalidTokens.push(token);



      }



      continue;



    }







    const rangeMatch = normalized.match(/^(\d+)-(\d+)$/);



    if (!rangeMatch) {



      invalidTokens.push(token);



      continue;



    }







    const start = Number(rangeMatch[1]);



    const end = Number(rangeMatch[2]);



    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > maxPage) {



      invalidTokens.push(token);



      continue;



    }







    for (let pageNum = start; pageNum <= end; pageNum++) {



      pages.add(pageNum);



    }



  }







  return {



    pages: Array.from(pages).sort((a, b) => a - b),



    invalidTokens,



  };



}







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







type DiscoverRunProgress = {



  found: number;



  target: number;



  batches: number;



  hasMore: boolean;



};







type DiscoverRunResponse = {
  ok: boolean;
  runId?: number;
  done?: boolean;
  shortfallReason?: string | null;
  stopReason?: string | null;
  error?: string;
  products?: PricedProduct[];
  newProducts?: PricedProduct[];
  queue?: {
    state?: string;
    position?: number | null;
    total?: number;
    isHead?: boolean;
    countdownEndsAt?: string | null;
    countdownRemainingMs?: number;
    heartbeatTimeoutMs?: number;
    notificationLeadMs?: number;
  };
  run?: {
    id: number;
    status: string;
    progress?: DiscoverRunProgress;
  };
};







const DISCOVER_NON_PRODUCT_IMAGE_RE = /(sprite|icon|favicon|logo|placeholder|blank|loading|badge|flag|promo|banner|sale|discount|qr|sizechart|size\s*chart|chart|table|guide|thumb|thumbnail|small|tiny|mini)/i;



const DISCOVER_IMAGE_KEY_SIZE_TOKEN_RE = /[_-](\d{2,4})x(\d{2,4})(?=\.)/gi;



const DISCOVER_RESULTS_PER_PAGE = 40;



const DISCOVER_DELETED_PIDS_STORAGE_KEY = "discover_deleted_pids_v1";



const DEFAULT_DISCOVER_PROFILE: DiscoverProfile = "full";

const DISCOVER_CLIENT_SESSION_STORAGE_KEY = "discover_client_session_id_v1";

const DISCOVER_QUEUE_NOTIFICATION_LEAD_FALLBACK_MS = 60_000;

function formatDiscoverQueueCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return String(minutes) + ":" + String(seconds).padStart(2, "0");
}







function normalizeDiscoverPid(value: unknown): string {



  return normalizeCjProductId(value);



}







function normalizeDiscoverPidList(value: unknown): string[] {



  if (!Array.isArray(value)) return [];







  const normalized = new Set<string>();



  for (const raw of value) {



    const pid = normalizeDiscoverPid(raw);



    if (pid) normalized.add(pid);



  }







  return Array.from(normalized);



}







function readDiscoverDeletedPidsFromStorage(): string[] {



  if (typeof window === "undefined") return [];



  try {



    const raw = localStorage.getItem(DISCOVER_DELETED_PIDS_STORAGE_KEY);



    if (!raw) return [];



    return normalizeDiscoverPidList(JSON.parse(raw));



  } catch {



    return [];



  }



}







function delay(ms: number): Promise<void> {



  return new Promise((resolve) => {



    setTimeout(resolve, ms);



  });



}







function saveDiscoverDeletedPidsToStorage(pids: string[]): void {



  if (typeof window === "undefined") return;



  try {



    localStorage.setItem(DISCOVER_DELETED_PIDS_STORAGE_KEY, JSON.stringify(normalizeDiscoverPidList(pids)));



  } catch {



    // Ignore storage errors; server-side persistence remains authoritative.



  }



}







function clampNumber(value: number, min: number, max: number): number {



  if (!Number.isFinite(value)) return min;



  return Math.max(min, Math.min(max, value));



}







function computeDiscoverAdaptiveBatchSize(



  targetQuantity: number,



  mediaMode: "withVideo" | "imagesOnly" | "both",



  discoverProfile: DiscoverProfile



): number {



  const quantityBoost =



    targetQuantity >= 10000 ? 22 :



    targetQuantity >= 5000 ? 20 :



    targetQuantity >= 2000 ? 18 :



    targetQuantity >= 1000 ? 16 :



    targetQuantity >= 500 ? 14 :



    targetQuantity >= 200 ? 12 :



    targetQuantity >= 100 ? 10 :



    8;



  const mediaPenalty = mediaMode === "both" ? 3 : mediaMode === "withVideo" ? 2 : 0;



  const profileBoost = discoverProfile === "fast" ? 2 : 0;



  return clampNumber(quantityBoost - mediaPenalty + profileBoost, 3, 24);



}







function filterDiscoverProductsByDeletedSet(



  products: PricedProduct[],



  deletedPidSet: Set<string>



): PricedProduct[] {



  if (!Array.isArray(products) || products.length === 0 || deletedPidSet.size === 0) {



    return Array.isArray(products) ? products : [];



  }







  return products.filter((product) => {



    const normalizedPid = normalizeDiscoverPid(product?.pid);



    return !normalizedPid || !deletedPidSet.has(normalizedPid);



  });



}







function mergeDiscoverProductsByPid(



  currentProducts: PricedProduct[],



  incomingProducts: PricedProduct[],



  deletedPidSet: Set<string>



): PricedProduct[] {



  if (!Array.isArray(incomingProducts) || incomingProducts.length === 0) {



    return filterDiscoverProductsByDeletedSet(currentProducts, deletedPidSet);



  }







  const merged = Array.isArray(currentProducts) ? [...currentProducts] : [];



  const seenPids = new Set<string>();







  for (const product of merged) {



    const normalizedPid = normalizeDiscoverPid(product?.pid);



    if (normalizedPid) {



      seenPids.add(normalizedPid);



    }



  }







  for (const product of incomingProducts) {



    const normalizedPid = normalizeDiscoverPid(product?.pid);



    if (normalizedPid) {



      if (deletedPidSet.has(normalizedPid) || seenPids.has(normalizedPid)) {



        continue;



      }



      seenPids.add(normalizedPid);



    }



    merged.push(product);



  }







  return filterDiscoverProductsByDeletedSet(merged, deletedPidSet);



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



  const [media, setMedia] = useState<"withVideo" | "imagesOnly" | "both">("both");



  const [discoverProfile, setDiscoverProfile] = useState<DiscoverProfile>(DEFAULT_DISCOVER_PROFILE);



  const [existingProductPolicy, setExistingProductPolicy] = useState<DiscoverExistingProductPolicy>("excludeQueueAndStore");



  



  const [loading, setLoading] = useState(false);



  const [searchProgress, setSearchProgress] = useState("");



  const [error, setError] = useState<string | null>(null);



  const [products, setProducts] = useState<PricedProduct[]>([]);



  const [selected, setSelected] = useState<Set<string>>(new Set());



  const [resultsPage, setResultsPage] = useState(1);



  const [pageSelectionInput, setPageSelectionInput] = useState("");



  const [persistedDeletedPids, setPersistedDeletedPids] = useState<string[]>([]);



  const deletedPidRuntimeRef = useRef<Set<string>>(new Set());



  const activeRunIdRef = useRef<number | null>(null);



  const stopRequestedRef = useRef(false);



  const activeSearchAbortRef = useRef<AbortController | null>(null);

  const discoverClientSessionIdRef = useRef<string>("");

  const queueLastMinuteNotifiedRef = useRef(false);



  



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



  const isFastDiscoverProfile = discoverProfile === "fast";



  const TOTAL_PREVIEW_PAGES = isFastDiscoverProfile ? 2 : 7;







  const quantityPresets = [2000, 1500, 1000, 500, 250, 100, 50, 25, 10];



  const profitPresets = [100, 50, 25, 15, 8];

  const ensureDiscoverClientSessionId = (): string => {
    if (discoverClientSessionIdRef.current) return discoverClientSessionIdRef.current;

    let next = "";

    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem(DISCOVER_CLIENT_SESSION_STORAGE_KEY);
        if (stored && stored.trim()) next = stored.trim();
      } catch {
      }
    }

    if (!next) {
      next =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `discover-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(DISCOVER_CLIENT_SESSION_STORAGE_KEY, next);
        } catch {
        }
      }
    }

    discoverClientSessionIdRef.current = next;
    return next;
  };

  const notifyQueueLastMinute = () => {
    if (queueLastMinuteNotifiedRef.current) return;

    queueLastMinuteNotifiedRef.current = true;

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("Discover Search", {
          body: "Your queued discover search will start in about one minute.",
        });
      } catch {
      }
    }
  };



  useEffect(() => {



    if (isFastDiscoverProfile && previewPage > 2) {



      setPreviewPage(2);



    }



  }, [isFastDiscoverProfile, previewPage]);

  useEffect(() => {
    const handlePageExit = () => {
      const activeRunId = activeRunIdRef.current;
      if (!Number.isFinite(activeRunId) || !activeRunId) return;

      const body = JSON.stringify({ action: "cancel" });

      try {
        if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
          const payload = new Blob([body], { type: "application/json" });
          navigator.sendBeacon(`/api/admin/jobs/${activeRunId}`, payload);
          return;
        }
      } catch {
      }

      try {
        void fetch(`/api/admin/jobs/${activeRunId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
      } catch {
      }
    };

    window.addEventListener("pagehide", handlePageExit);
    window.addEventListener("beforeunload", handlePageExit);

    return () => {
      window.removeEventListener("pagehide", handlePageExit);
      window.removeEventListener("beforeunload", handlePageExit);
    };
  }, []);



  







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



    const deletedSet = new Set<string>(



      persistedDeletedPids



        .map((value: string) => normalizeDiscoverPid(value))



        .filter((value): value is string => Boolean(value))



    );



    deletedPidRuntimeRef.current = deletedSet;







    setProducts((prev: PricedProduct[]) => {



      const filtered = filterDiscoverProductsByDeletedSet(prev, deletedSet);



      return filtered.length === prev.length ? prev : filtered;



    });







    setSelected((prev: Set<string>) => {



      if (prev.size === 0 || deletedSet.size === 0) return prev;



      let changed = false;



      const next = new Set<string>();



      for (const pid of prev) {



        const normalizedPid = normalizeDiscoverPid(pid);



        if (normalizedPid && deletedSet.has(normalizedPid)) {



          changed = true;



          continue;



        }



        next.add(pid);



      }



      return changed ? next : prev;



    });



  }, [persistedDeletedPids]);







  useEffect(() => {



    let cancelled = false;







    const loadDeletedPids = async () => {



      const localPids = readDiscoverDeletedPidsFromStorage();



      if (!cancelled && localPids.length > 0) {



        setPersistedDeletedPids(localPids);



      }







      try {



        const res = await fetch("/api/admin/cj/discover-deleted", { cache: "no-store" });



        if (!res.ok) return;







        const data = await res.json();



        if (!data?.ok) return;







        const remotePids = normalizeDiscoverPidList(data.deletedPids);



        const merged = Array.from(new Set([...localPids, ...remotePids]));



        if (!cancelled) {



          setPersistedDeletedPids(merged);



        }



        saveDiscoverDeletedPidsToStorage(merged);



      } catch (e) {



        console.warn("[Discovery] Failed to load persistent deleted products:", e);



      }



    };







    void loadDeletedPids();







    return () => {



      cancelled = true;



    };



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



        setFeatures((prev: FeatureOption[]) => {



          const filtered = prev.filter((f: FeatureOption) => f.parentId !== categoryId);



          return [...filtered, ...newFeatures];



        });



      }



    } catch (e) {



      console.error("Failed to load features:", e);



    }



  };







  const cancelDiscoverRunJob = async (runId: number): Promise<boolean> => {



    if (!Number.isFinite(runId) || runId <= 0) return false;







    try {



      const cancelRes = await fetch(`/api/admin/jobs/${runId}`, {



        method: "POST",



        headers: { "Content-Type": "application/json" },



        body: JSON.stringify({ action: "cancel" }),



      });



      if (!cancelRes.ok) {



        console.warn(`[Discovery] Cancel request failed for run ${runId}: HTTP ${cancelRes.status}`);



        return false;



      }



      return true;



    } catch (cancelError) {



      console.warn("[Discovery] Failed to cancel active search:", cancelError);



      return false;



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



    setPageSelectionInput("");



    setSavedBatchId(null);

    queueLastMinuteNotifiedRef.current = false;

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }



    setResultsPage(1);



    stopRequestedRef.current = false;



    activeSearchAbortRef.current = null;







    const deletedSeed = Array.from(new Set([



      ...persistedDeletedPids,



      ...readDiscoverDeletedPidsFromStorage(),



      ...Array.from(deletedPidRuntimeRef.current),



    ]));



    const initialDeletedPidSet = new Set(



      deletedSeed



        .map((value) => normalizeDiscoverPid(value))



        .filter(Boolean)



    );



    deletedPidRuntimeRef.current = initialDeletedPidSet;







    const categoryIds = selectedFeatures.length > 0 ? selectedFeatures : [category];



    const seenPids = Array.from(initialDeletedPidSet);



    const adaptiveBatchSize = computeDiscoverAdaptiveBatchSize(quantity, media, discoverProfile);







    let runId: number | null = null;



    let allProducts: PricedProduct[] = [];



    let lastShortfallReason: string | null = null;







    try {



      activeSearchAbortRef.current = null;



      const clientSessionId = ensureDiscoverClientSessionId();

      const createRunRes = await fetch("/api/admin/cj/discover-runs", {



        method: "POST",



        headers: { "Content-Type": "application/json" },



        body: JSON.stringify({



          categoryIds,



          quantity,



          minPrice,



          maxPrice,



          minStock,



          profitMargin,



          popularity,



          minRating,



          shippingMethod,



          freeShippingOnly,



          mediaMode: media,



          discoverProfile,



          existingProductPolicy,



          batchSize: adaptiveBatchSize,

          seenPids,

          clientSessionId,



        }),



      });



      activeSearchAbortRef.current = null;







      const createContentType = createRunRes.headers.get("content-type") || "";



      if (!createContentType.includes("application/json")) {



        const text = await createRunRes.text();



        throw new Error(`Server error: ${text.slice(0, 100)}...`);



      }







      const createRunData: DiscoverRunResponse = await createRunRes.json();



      if (!createRunRes.ok || !createRunData.ok || !createRunData.runId) {



        throw new Error(createRunData.error || `Failed to start discover run: ${createRunRes.status}`);



      }







      runId = Number(createRunData.runId);



      if (!Number.isFinite(runId) || runId <= 0) {



        throw new Error("Invalid discover run id");



      }



      activeRunIdRef.current = runId;







      if (stopRequestedRef.current) {



        await cancelDiscoverRunJob(runId);



      }







      let done = stopRequestedRef.current;



      let executionSafetyTicks = 0;



      let adaptiveMaxBatches =



        quantity >= 5000 ? 12 :



        quantity >= 2000 ? 10 :



        quantity >= 1000 ? 8 :



        quantity >= 200 ? 5 :



        quantity >= 100 ? 4 :



        3;



      if (discoverProfile === "fast") {



        adaptiveMaxBatches = clampNumber(adaptiveMaxBatches + 2, 1, 24);



      }



      let adaptiveMaxDurationMs = quantity >= 200 ? 9000 : quantity >= 100 ? 8500 : 7600;



      if (discoverProfile === "fast") {



        adaptiveMaxDurationMs = clampNumber(adaptiveMaxDurationMs + 300, 7000, 9000);



      }



      let previousFound = 0;



      let previousBatchCount = 0;







      while (!done) {



        if (stopRequestedRef.current) {



          if (runId) {



            await cancelDiscoverRunJob(runId);



          }



          done = true;



          break;



        }



        executionSafetyTicks++;



        const stepStartedAt = Date.now();



        const stepAbortController = new AbortController();



        activeSearchAbortRef.current = stepAbortController;







        const stepRes = await fetch(`/api/admin/cj/discover-runs/${runId}/run`, {



          method: "POST",



          headers: { "Content-Type": "application/json" },



          signal: stepAbortController.signal,



          body: JSON.stringify({



            maxDurationMs: adaptiveMaxDurationMs,



            maxBatches: adaptiveMaxBatches,



            deletedPids: Array.from(deletedPidRuntimeRef.current),

            clientSessionId,



          }),



        });



        activeSearchAbortRef.current = null;



        const stepDurationMs = Date.now() - stepStartedAt;







        const stepContentType = stepRes.headers.get("content-type") || "";



        if (!stepContentType.includes("application/json")) {



          const text = await stepRes.text();



          throw new Error(`Server error: ${text.slice(0, 100)}...`);



        }







        const stepData: DiscoverRunResponse = await stepRes.json();



        if (!stepRes.ok || !stepData.ok) {



          throw new Error(stepData.error || `Discover run step failed: ${stepRes.status}`);



        }







        const queueState = String(stepData.queue?.state || "").trim();

        const queuePosition = Number(stepData.queue?.position || NaN);

        const queueTotal = Number(stepData.queue?.total || NaN);

        const queueCountdownRemainingMs = Math.max(0, Number(stepData.queue?.countdownRemainingMs || 0));

        const queueNotificationLeadMs = Math.max(
          0,
          Number(stepData.queue?.notificationLeadMs || DISCOVER_QUEUE_NOTIFICATION_LEAD_FALLBACK_MS)
        );

        const queuedWaitingTurn = queueState === "waiting_turn" || stepData.stopReason === "queued_waiting_turn";

        const queuedCountdown = queueState === "countdown" || stepData.stopReason === "queued_countdown";

        if (queuedWaitingTurn || queuedCountdown) {
          if (queuedCountdown) {
            setSearchProgress(`Queued: your turn starts in ${formatDiscoverQueueCountdown(queueCountdownRemainingMs)}.`);

            if (queueCountdownRemainingMs > 0 && queueCountdownRemainingMs <= queueNotificationLeadMs) {
              notifyQueueLastMinute();
            } else if (queueCountdownRemainingMs > queueNotificationLeadMs) {
              queueLastMinuteNotifiedRef.current = false;
            }

            await delay(1000);
          } else {
            queueLastMinuteNotifiedRef.current = false;

            const positionLabel =
              Number.isFinite(queuePosition) && queuePosition > 0 && Number.isFinite(queueTotal) && queueTotal > 0
                ? ` (${Math.floor(queuePosition)}/${Math.floor(queueTotal)})`
                : "";

            setSearchProgress(`Queued and waiting for your turn${positionLabel}.`);

            await delay(1500);
          }

          executionSafetyTicks = Math.max(0, executionSafetyTicks - 1);
          continue;
        }

        queueLastMinuteNotifiedRef.current = false;

        const hasIncrementalPayload = Array.isArray(stepData.newProducts);



        const incomingProducts = hasIncrementalPayload



          ? (stepData.newProducts as PricedProduct[])



          : (Array.isArray(stepData.products) ? stepData.products : []);







        allProducts = hasIncrementalPayload



          ? mergeDiscoverProductsByPid(allProducts, incomingProducts, deletedPidRuntimeRef.current)



          : filterDiscoverProductsByDeletedSet(incomingProducts, deletedPidRuntimeRef.current);







        setProducts([...allProducts]);







        const progress = stepData.run?.progress;



        const foundFromProgress = Number(progress?.found);



        const found = Number.isFinite(foundFromProgress) && foundFromProgress >= 0



          ? Math.floor(foundFromProgress)



          : allProducts.length;



        const target = Number(progress?.target || quantity);



        const batches = Number(progress?.batches || executionSafetyTicks);



        setSearchProgress(`Finding products... (batch ${batches}, found ${found}/${target})`);







        if (typeof stepData.shortfallReason === "string" && stepData.shortfallReason.trim()) {



          lastShortfallReason = stepData.shortfallReason.trim();



        }







        done = Boolean(stepData.done);



        if (stepData.run?.status === "canceled") {



          stopRequestedRef.current = true;



          done = true;



        }



        if (!done) {



          const foundDelta = Math.max(0, found - previousFound);



          const batchDelta = Math.max(1, batches - previousBatchCount);



          const foundPerBatch = foundDelta / batchDelta;



          const durationPressure = stepDurationMs > adaptiveMaxDurationMs * 0.92;







          if (foundPerBatch >= 1.8 && !durationPressure) {



            adaptiveMaxBatches = clampNumber(adaptiveMaxBatches + 1, 1, 24);



            adaptiveMaxDurationMs = clampNumber(adaptiveMaxDurationMs + 400, 7000, 9000);



          } else if (foundPerBatch < 0.8 || durationPressure) {



            adaptiveMaxBatches = clampNumber(adaptiveMaxBatches - 1, 1, 24);



            adaptiveMaxDurationMs = clampNumber(adaptiveMaxDurationMs - 500, 7000, 9000);



          } else if (foundDelta === 0 && stepDurationMs < adaptiveMaxDurationMs * 0.7) {



            adaptiveMaxBatches = clampNumber(adaptiveMaxBatches + 1, 1, 24);



          }







          const pollDelayMs = foundPerBatch >= 1.8 ? 120 : foundPerBatch < 0.8 ? 320 : 200;



          await delay(pollDelayMs);



        }







        previousFound = found;



        previousBatchCount = batches;







        if (executionSafetyTicks >= 180) {



          throw new Error("Discover run took too long. Please try again with fewer products.");



        }



      }







      setProducts(filterDiscoverProductsByDeletedSet(allProducts, deletedPidRuntimeRef.current));



      if (stopRequestedRef.current) {



        setError(



          allProducts.length > 0



            ? "Notice: Search stopped by your request. Showing products found so far."



            : "Search stopped by your request."



        );



      }







      if (!stopRequestedRef.current && allProducts.length < quantity) {



        const reason =



          lastShortfallReason ||



          `Found ${allProducts.length}/${quantity} products. Not enough matching products in this category.`;



        setError(`Notice: ${reason}`);



      }







      if (!stopRequestedRef.current && allProducts.length === 0) {



        setError(



          discoverProfile === "fast"



            ? "No products found in fast profile. Try full profile, a different category, or broader filters."



            : "No products found with configured shipping methods. Try a different category."



        );



      }







    } catch (e: any) {



      const isAbortLikeError =



        String(e?.name || "").toLowerCase() === "aborterror" || /abort/i.test(String(e?.message || ""));







      const userStopped =



        stopRequestedRef.current &&



        (isAbortLikeError || !runId);



      if (!userStopped) {



        setError(e?.message || "Search failed");



      }







      if (userStopped && runId) {



        await cancelDiscoverRunJob(runId);



      }



      if (runId) {



        try {



          const statusRes = await fetch(`/api/admin/cj/discover-runs/${runId}?limit=${quantity}`, {



            cache: "no-store",



          });



          const statusData: DiscoverRunResponse = await statusRes.json();



          if (statusRes.ok && statusData.ok && Array.isArray(statusData.products) && statusData.products.length > 0) {



            allProducts = filterDiscoverProductsByDeletedSet(statusData.products, deletedPidRuntimeRef.current);



            setProducts(allProducts);



            if (typeof statusData.shortfallReason === "string" && statusData.shortfallReason.trim()) {



              setError(`Notice: ${statusData.shortfallReason.trim()}`);



            }



          }



        } catch {



          // keep original error



        }



      }







      if (allProducts.length > 0) {



        setProducts([...allProducts]);



      }



      if (userStopped) {



        setError(



          allProducts.length > 0



            ? "Notice: Search stopped by your request. Showing products found so far."



            : "Search stopped by your request."



        );



      }



    } finally {



      activeSearchAbortRef.current = null;



      activeRunIdRef.current = null;



      stopRequestedRef.current = false;



      setLoading(false);



      setSearchProgress("");

      queueLastMinuteNotifiedRef.current = false;



    }



  };







  const stopSearch = async (): Promise<void> => {



    if (!loading) return;



    stopRequestedRef.current = true;



    setSearchProgress("Stopping search...");







    if (activeSearchAbortRef.current) {



      activeSearchAbortRef.current.abort();



    }







    const activeRunId = activeRunIdRef.current;



    if (!activeRunId) return;







    try {



      await cancelDiscoverRunJob(activeRunId);



    } catch {



      // cancelDiscoverRunJob already logs failures; keep stop flow resilient



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







  const selectAll = (): void => {



    setSelected(new Set<string>(products.map((p: PricedProduct) => p.pid)));



  };







  const deselectAll = (): void => {



    setSelected(new Set());



  };







  const removeProduct = async (productId: string, e: ReactMouseEvent<HTMLButtonElement>) => {



    e.stopPropagation();



    const normalizedPid = normalizeDiscoverPid(productId);







    if (normalizedPid) {



      deletedPidRuntimeRef.current.add(normalizedPid);



    }







    setProducts((prev: PricedProduct[]) => prev.filter((p: PricedProduct) => {



      if (p.pid === productId) return false;



      if (!normalizedPid) return true;



      return normalizeDiscoverPid(p.pid) !== normalizedPid;



    }));



    setSelected((prev: Set<string>) => {



      const next = new Set<string>(prev);







      if (!normalizedPid) {



        next.delete(productId);



        return next;



      }







      for (const pid of Array.from(next)) {



        const normalizedSelectedPid = normalizeDiscoverPid(pid);



        if (normalizedSelectedPid && normalizedSelectedPid === normalizedPid) {



          next.delete(pid);



        }



      }



      return next;



    });







    if (!normalizedPid) return;







    setPersistedDeletedPids((prev) => {



      if (prev.includes(normalizedPid)) return prev;



      const next = [...prev, normalizedPid];



      saveDiscoverDeletedPidsToStorage(next);



      return next;



    });







    let persisted = false;



    let lastPersistError: unknown = null;



    for (let attempt = 1; attempt <= 2 && !persisted; attempt++) {



      try {



        const res = await fetch("/api/admin/cj/discover-deleted", {



          method: "POST",



          headers: { "Content-Type": "application/json" },



          body: JSON.stringify({ pids: [normalizedPid] }),



        });







        if (!res.ok) {



          throw new Error(`HTTP ${res.status}`);



        }







        const data = await res.json();



        if (data?.ok && Array.isArray(data.deletedPids)) {



          const remotePids = normalizeDiscoverPidList(data.deletedPids);



          setPersistedDeletedPids((prev) => {



            const merged = Array.from(new Set([...prev, ...remotePids]));



            saveDiscoverDeletedPidsToStorage(merged);



            return merged;



          });



        }







        persisted = true;



      } catch (err) {



        lastPersistError = err;



        if (attempt < 2) {



          await delay(300);



        }



      }



    }







    if (!persisted) {



      console.warn(`[Discovery] Failed to persist deleted product ${normalizedPid}:`, lastPersistError);



      setError(`Notice: Product ${normalizedPid} was removed locally, but global delete sync failed. It will stay hidden in this session.`);



    }



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



    if (isFastDiscoverProfile) {



      return page === 1 ? "Overview" : "Product Gallery";



    }



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



    if (isFastDiscoverProfile) {



      return page === 1 ? <Package className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />;



    }



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



      let selectedProducts = products.filter((p: PricedProduct) => selected.has(p.pid));



      const allSelectedFromOfflineCatalog = selectedProducts.length > 0

        && selectedProducts.every((product: PricedProduct) =>

          String((product as any)?.discoverSource || '').toLowerCase() === 'offline-catalog'

        );





      if (discoverProfile === "fast" && selectedProducts.length > 0 && !allSelectedFromOfflineCatalog) {



        const hydrationQueue = [...selectedProducts];



        const hydratedByPid = new Map<string, PricedProduct>();



        const hydrationErrors: string[] = [];



        const totalToHydrate = hydrationQueue.length;



        const workerCount = Math.min(

          totalToHydrate,

          totalToHydrate >= 60 ? 6 : totalToHydrate >= 30 ? 4 : 3

        );





        const hydrateProduct = async (product: PricedProduct): Promise<void> => {



          const response = await fetch(

            `/api/admin/cj/products/${encodeURIComponent(product.pid)}/details?profitMargin=${encodeURIComponent(String(profitMargin))}`,

            { cache: "no-store" }

          );



          const payload = await response.json().catch(() => ({}));





          if (!response.ok || !payload?.ok || !payload?.product) {



            const serverError = typeof payload?.error === "string" ? payload.error : `HTTP ${response.status}`;



            throw new Error(serverError);



          }





          hydratedByPid.set(product.pid, payload.product as PricedProduct);



        };





        await Promise.all(

          Array.from({ length: workerCount }, async () => {



            while (hydrationQueue.length > 0) {



              const nextProduct = hydrationQueue.shift();



              if (!nextProduct) break;





              try {



                await hydrateProduct(nextProduct);



              } catch (e: any) {



                hydrationErrors.push(`${nextProduct.pid}: ${e?.message || "hydration failed"}`);



              }



            }



          })

        );





        if (hydrationErrors.length > 0) {



          const sampleFailures = hydrationErrors.slice(0, 3).join(" | ");



          throw new Error(

            `Failed to hydrate ${hydrationErrors.length}/${totalToHydrate} fast-profile products before queue import. ${sampleFailures}`

          );



        }





        selectedProducts = selectedProducts.map((product: PricedProduct) => hydratedByPid.get(product.pid) || product);



      }



      const res = await fetch("/api/admin/import/batch", {



        method: "POST",



        headers: { "Content-Type": "application/json" },



        body: JSON.stringify({



          name: batchName || `Discovery ${new Date().toLocaleDateString()}`,



          mediaMode: media,



          discoverProfile,



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







  const selectedCategory = categories.find((c: Category) => c.categoryId === category);







  // Backend search-and-price route is authoritative for media filtering.



  // Keep rendering aligned with backend results to avoid client/backend divergence.



  const displayedProducts = products;



  const totalResultsPages = Math.max(1, Math.ceil(displayedProducts.length / DISCOVER_RESULTS_PER_PAGE));



  const pagedProducts = useMemo(() => {



    const start = (resultsPage - 1) * DISCOVER_RESULTS_PER_PAGE;



    return displayedProducts.slice(start, start + DISCOVER_RESULTS_PER_PAGE);



  }, [displayedProducts, resultsPage]);



  const currentPageStart = displayedProducts.length === 0



    ? 0



    : (resultsPage - 1) * DISCOVER_RESULTS_PER_PAGE + 1;



  const currentPageEnd = Math.min(resultsPage * DISCOVER_RESULTS_PER_PAGE, displayedProducts.length);



  const visiblePageNumbers = useMemo(() => {



    const out: number[] = [];



    const start = Math.max(1, resultsPage - 2);



    const end = Math.min(totalResultsPages, resultsPage + 2);



    for (let page = start; page <= end; page++) {



      out.push(page);



    }



    return out;



  }, [resultsPage, totalResultsPages]);







  useEffect(() => {



    setResultsPage((prev) => Math.min(prev, totalResultsPages));



  }, [totalResultsPages]);







  const selectCurrentPage = (): void => {



    if (pagedProducts.length === 0) return;



    setSelected((prev: Set<string>) => {



      const next = new Set<string>(prev);



      for (const product of pagedProducts) {



        next.add(product.pid);



      }



      return next;



    });



  };







  const deselectCurrentPage = (): void => {



    if (pagedProducts.length === 0) return;



    setSelected((prev: Set<string>) => {



      if (prev.size === 0) return prev;



      const next = new Set<string>(prev);



      for (const product of pagedProducts) {



        next.delete(product.pid);



      }



      return next;



    });



  };







  const selectPagesFromInput = (): void => {



    const parsed = parseDiscoverPageSelectionInput(pageSelectionInput, totalResultsPages);



    if (parsed.invalidTokens.length > 0) {



      setError(`Invalid page input: ${parsed.invalidTokens.join(", ")}. Use formats like 1,3,5-8.`);



      return;



    }







    if (parsed.pages.length === 0) {



      setError("Enter one or more pages (example: 1,3,5-8).");



      return;



    }







    const pidsToSelect = new Set<string>();



    for (const pageNum of parsed.pages) {



      const start = (pageNum - 1) * DISCOVER_RESULTS_PER_PAGE;



      const pageProducts = displayedProducts.slice(start, start + DISCOVER_RESULTS_PER_PAGE);



      for (const product of pageProducts) {



        pidsToSelect.add(product.pid);



      }



    }







    setSelected((prev: Set<string>) => {



      const next = new Set<string>(prev);



      for (const pid of pidsToSelect) {



        next.add(pid);



      }



      return next;



    });



    setError(null);



  };



  



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



            <label className="block text-sm text-gray-600 mb-2">Discover Profile</label>



            <select



              value={discoverProfile}



              onChange={(e: ReactChangeEvent<HTMLSelectElement>) => setDiscoverProfile(e.target.value as DiscoverProfile)}



              className="w-full px-3 py-2 border border-gray-300 rounded"



            >



              <option value="full">Full (complete enrichment)</option>



              <option value="fast">Fast (speed-first experiment)</option>



            </select>



            <p className="text-xs text-gray-500 mt-1">



              Fast profile keeps discovery lightweight and preview limited to 2 pages.



            </p>



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



                    



                    // Toggle the CJ feature ID



                    toggleFeature(cjId);



                    



                    // Track the Supabase category ID if available



                    if (supabaseId && parseInt(supabaseId) > 0) {



                      const existing = selectedFeaturesWithIds.find((sf: SelectedFeature) => sf.cjCategoryId === cjId);



                      if (!existing) {



                        setSelectedFeaturesWithIds((prev: SelectedFeature[]) => [...prev, {



                          cjCategoryId: cjId,



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



                      const cjId = matchingCjCat?.categoryId || `supabase-${item.id}`;



                      



                      return (



                        <option 



                          key={item.id} 



                          value={`${cjId}:${item.id}:${item.name}`}



                          disabled={selectedFeatures.includes(cjId)}



                        >



                          {item.name}



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







          <div>



            <label className="block text-sm text-gray-600 mb-2">Existing Product Policy</label>



            <select



              value={existingProductPolicy}



              onChange={(e: ReactChangeEvent<HTMLSelectElement>) => setExistingProductPolicy(e.target.value as DiscoverExistingProductPolicy)}



              className="w-full px-3 py-2 border border-gray-300 rounded"



            >



              <option value="excludeQueueAndStore">Exclude queue + store (safe default)</option>



              <option value="excludeQueueOnly">Exclude queue only (allow rediscover store products)</option>



              <option value="excludeNone">Exclude none (allow full rediscovery)</option>



            </select>



            <p className="text-xs text-gray-500 mt-1">



              Deleted products stay excluded in all modes.



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



                onChange={(e: ReactChangeEvent<HTMLInputElement>) => setProfitMargin(Number(e.target.value))}



                className="w-16 px-2 py-1.5 border border-gray-300 rounded text-center"



                dir="ltr"



              />



            </div>



            



            <div className="flex items-center gap-4">



              <input



                type="checkbox"



                checked={freeShippingOnly}



                onChange={(e: ReactChangeEvent<HTMLInputElement>) => setFreeShippingOnly(e.target.checked)}



                className="w-4 h-4 border-gray-300 rounded"



              />



              <label className="text-sm text-gray-700">Free Shipping Only</label>



            </div>



          </div>



          <p className="text-xs text-amber-600 mt-2 text-right">



            {discoverProfile === "fast"



              ? "Fast profile uses lightweight pricing for speed. Use Full profile when you need complete enrichment before final decisions."



              : "Set your desired profit margin. Products display final USD sell prices from priced variants using this applied margin."}



          </p>



        </div>







        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">



          <Link



            href={"/admin/import/queue" as Route}



            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"



          >



            Review Queue



          </Link>



          {loading ? (



            <button



              onClick={stopSearch}



              className="flex items-center gap-2 px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-medium"



            >



              <X className="h-4 w-4" />



              Stop Search



            </button>



          ) : (



            <button



              onClick={searchProducts}



              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"



            >



              Search Products



            </button>



          )}



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



            {discoverProfile === "fast"



              ? `Searching products in fast profile and applying ${profitMargin}% profit margin with lightweight enrichment.`



              : `Searching products, calculating shipping costs, and applying ${profitMargin}% profit margin. Final USD sell prices (with applied margin) will be added to the checklist exactly as shown.`}



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



                Found <strong>{displayedProducts.length}</strong> products (server-filtered)



              </span>



              <span className="text-sm text-gray-400">|</span>



              <span className="text-sm text-gray-600">



                Showing <strong>{currentPageStart}-{currentPageEnd}</strong>



              </span>



              <span className="text-sm text-gray-400">|</span>



              <span className="text-sm text-gray-600">



                <strong>{selected.size}</strong> selected



              </span>



            </div>



            <div className="flex flex-wrap items-center justify-end gap-2">



              <button onClick={selectAll} className="text-sm text-blue-600 hover:underline">Select All</button>



              <button onClick={deselectAll} className="text-sm text-gray-500 hover:underline">Clear All</button>



              <span className="text-gray-300">|</span>



              <button onClick={selectCurrentPage} className="text-sm text-blue-600 hover:underline">Select This Page</button>



              <button onClick={deselectCurrentPage} className="text-sm text-gray-500 hover:underline">Clear This Page</button>



              <span className="text-gray-300">|</span>



              <input



                type="text"



                value={pageSelectionInput}



                onChange={(e: ReactChangeEvent<HTMLInputElement>) => setPageSelectionInput(e.target.value)}



                placeholder="1,3,5-8"



                className="w-28 px-2 py-1 text-xs border border-gray-300 rounded"



                dir="ltr"



              />



              <button



                onClick={selectPagesFromInput}



                className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"



              >



                Select Pages



              </button>



            </div>



          </div>







          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">



            {pagedProducts.map((product: PricedProduct) => {



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



                        onClick={(e: ReactMouseEvent<HTMLButtonElement>) => toggleSelect(product.pid, e)}



                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${



                          isSelected ? "bg-blue-500" : "bg-white border border-gray-300 hover:bg-gray-100"



                        }`}



                      >



                        {isSelected && <CheckCircle className="h-4 w-4 text-white" />}



                      </button>



                    </div>



                    



                    <div className="absolute top-2 left-2 flex gap-1">



                      <button



                        onClick={(e: ReactMouseEvent<HTMLButtonElement>) => openPreview(product, e)}



                        className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center hover:bg-white"



                        title="Preview"



                      >



                        <Eye className="h-3.5 w-3.5 text-gray-700" />



                      </button>



                      <button



                        onClick={(e: ReactMouseEvent<HTMLButtonElement>) => removeProduct(product.pid, e)}



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







          {displayedProducts.length > DISCOVER_RESULTS_PER_PAGE && (



            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">



              <button



                onClick={() => setResultsPage((prev: number) => Math.max(1, prev - 1))}



                disabled={resultsPage === 1}



                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"



              >



                Previous



              </button>







              <div className="flex items-center gap-1.5">



                {resultsPage > 3 && (



                  <>



                    <button



                      onClick={() => setResultsPage(1)}



                      className="min-w-8 px-2 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50"



                    >



                      1



                    </button>



                    {resultsPage > 4 && <span className="px-1 text-gray-400">...</span>}



                  </>



                )}







                {visiblePageNumbers.map((pageNum: number) => (



                  <button



                    key={pageNum}



                    onClick={() => setResultsPage(pageNum)}



                    className={`min-w-8 px-2 py-1 text-sm rounded border ${



                      pageNum === resultsPage



                        ? "bg-blue-600 text-white border-blue-600"



                        : "border-gray-300 hover:bg-gray-50"



                    }`}



                  >



                    {pageNum}



                  </button>



                ))}







                {resultsPage < totalResultsPages - 2 && (



                  <>



                    {resultsPage < totalResultsPages - 3 && <span className="px-1 text-gray-400">...</span>}



                    <button



                      onClick={() => setResultsPage(totalResultsPages)}



                      className="min-w-8 px-2 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50"



                    >



                      {totalResultsPages}



                    </button>



                  </>



                )}



              </div>







              <button



                onClick={() => setResultsPage((prev: number) => Math.min(totalResultsPages, prev + 1))}



                disabled={resultsPage === totalResultsPages}



                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"



              >



                Next



              </button>



            </div>



          )}







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



                  onChange={(e: ReactChangeEvent<HTMLInputElement>) => setBatchName(e.target.value)}



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



          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e: ReactMouseEvent<HTMLDivElement>) => e.stopPropagation()}>



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



                      Product Gallery ({previewGalleryImages.length} images{!isFastDiscoverProfile && previewVideoUrl ? " + video" : ""})



                    </h4>



                  </div>







                  {!isFastDiscoverProfile && previewVideoUrl && (



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



                    <div



                      className={isFastDiscoverProfile



                        ? "mx-auto grid max-w-sm grid-cols-1 gap-4"



                        : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"}



                    >



                      {previewGalleryImages.map((img: string, index: number) => (



                        <div



                          key={index}



                          className={`relative overflow-hidden rounded-lg bg-gray-100 group ${isFastDiscoverProfile ? "aspect-[3/4]" : "aspect-square"}`}



                        >



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



              {!isFastDiscoverProfile && previewPage === 3 && (



                <PreviewPageThree product={previewProduct} />



              )}



              



              {/* Page 4: Stock & Popularity */}



              {!isFastDiscoverProfile && previewPage === 4 && (



                <PreviewPageFour product={previewProduct} />



              )}







              {/* Page 5: Shipping & Delivery */}



              {!isFastDiscoverProfile && previewPage === 5 && (



                <PreviewPageFive product={previewProduct} />



              )}



              



              {/* Page 6: Variant Pricing */}



              {!isFastDiscoverProfile && previewPage === 6 && (



                <PreviewPageSix product={previewProduct} />



              )}







              {/* Page 7: AI Media */}



              {!isFastDiscoverProfile && previewPage === 7 && (



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



