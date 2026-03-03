import { createClient } from "@supabase/supabase-js";
import type { Product } from "./types";
import { normalizeDisplayedRating } from "./rating/engine";
import { enhanceProductImageUrl } from "./media/image-quality";

function getServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("[homepage-products] Missing Supabase env vars:", {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey
    });
    return null;
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export interface HomepageProduct {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  displayed_rating?: number | null;
  image: string;
  badge?: string;
  slug: string;
}

type HomepageProductRow = Pick<Product, "id" | "title" | "slug" | "price" | "images" | "displayed_rating">;

const ACTIVE_PRODUCT_FILTER = "is_active.is.null,is_active.eq.true";

function isMissingIsActiveError(error: any): boolean {
  if (!error) return false;
  const code = String((error as any).code || "").toLowerCase();
  const message = String((error as any).message || "").toLowerCase();
  const details = String((error as any).details || "").toLowerCase();
  return code === "42703" || message.includes("is_active") || details.includes("is_active");
}

function mapProductToHomepage(product: HomepageProductRow, badge?: string): HomepageProduct {
  const primaryImage = Array.isArray(product.images) && product.images.length > 0
    ? product.images[0]
    : "https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=200&h=200&fit=crop";
  const enhancedPrimaryImage = enhanceProductImageUrl(primaryImage, "card");
  
  return {
    id: product.id,
    name: product.title,
    price: product.price,
    originalPrice: undefined,
    displayed_rating: normalizeDisplayedRating(product.displayed_rating),
    image: enhancedPrimaryImage,
    badge,
    slug: product.slug,
  };
}

export async function getFlashSaleProducts(limit = 8): Promise<HomepageProduct[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  
  try {
    let { data, error } = await supabase
      .from("products")
      .select("id, title, slug, price, images, displayed_rating")
      .or(ACTIVE_PRODUCT_FILTER)
      .order("displayed_rating", { ascending: false })
      .limit(limit);

    if (isMissingIsActiveError(error)) {
      const fallback = await supabase
        .from("products")
        .select("id, title, slug, price, images, displayed_rating")
        .order("displayed_rating", { ascending: false })
        .limit(limit);
      data = fallback.data as any;
      error = fallback.error as any;
    }

    if (error) {
      console.error("Error fetching flash sale products:", error);
      return [];
    }

    return (data || []).map((p: HomepageProductRow) => mapProductToHomepage(p, "FLASH"));
  } catch (e) {
    console.error("Exception fetching flash sale products:", e);
    return [];
  }
}

export async function getNewArrivals(limit = 6): Promise<HomepageProduct[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  
  try {
    let { data, error } = await supabase
      .from("products")
      .select("id, title, slug, price, images, displayed_rating")
      .or(ACTIVE_PRODUCT_FILTER)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (isMissingIsActiveError(error)) {
      const activeFallback = await supabase
        .from("products")
        .select("id, title, slug, price, images, displayed_rating")
        .order("created_at", { ascending: false })
        .limit(limit);
      data = activeFallback.data as any;
      error = activeFallback.error as any;
    }

    if (error && (error as any).code === "42703") {
      const fallback = await supabase
        .from("products")
        .select("id, title, slug, price, images, displayed_rating")
        .order("id", { ascending: false })
        .limit(limit);
      data = fallback.data as any;
      error = fallback.error;
    }

    if (error) {
      console.error("Error fetching new arrivals:", error);
      return [];
    }

    return (data || []).map((p: HomepageProductRow) => mapProductToHomepage(p, "NEW"));
  } catch (e) {
    console.error("Exception fetching new arrivals:", e);
    return [];
  }
}

export async function getBestSellers(limit = 6): Promise<HomepageProduct[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  
  try {
    let { data, error } = await supabase
      .from("products")
      .select("id, title, slug, price, images, displayed_rating")
      .or(ACTIVE_PRODUCT_FILTER)
      .order("displayed_rating", { ascending: false })
      .limit(limit);

    if (isMissingIsActiveError(error)) {
      const fallback = await supabase
        .from("products")
        .select("id, title, slug, price, images, displayed_rating")
        .order("displayed_rating", { ascending: false })
        .limit(limit);
      data = fallback.data as any;
      error = fallback.error as any;
    }

    if (error) {
      console.error("Error fetching best sellers:", error);
      return [];
    }

    return (data || []).map((p: HomepageProductRow) => mapProductToHomepage(p));
  } catch (e) {
    console.error("Exception fetching best sellers:", e);
    return [];
  }
}

export async function getProductsByCategory(category: string, limit = 6): Promise<HomepageProduct[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  
  try {
    let { data, error } = await supabase
      .from("products")
      .select("id, title, slug, price, images, displayed_rating")
      .ilike("category", `%${category}%`)
      .or(ACTIVE_PRODUCT_FILTER)
      .limit(limit);

    if (isMissingIsActiveError(error)) {
      const fallback = await supabase
        .from("products")
        .select("id, title, slug, price, images, displayed_rating")
        .ilike("category", `%${category}%`)
        .limit(limit);
      data = fallback.data as any;
      error = fallback.error as any;
    }

    if (error) {
      console.error(`Error fetching ${category} products:`, error);
      return [];
    }

    return (data || []).map((p: HomepageProductRow) => mapProductToHomepage(p));
  } catch (e) {
    console.error(`Exception fetching ${category} products:`, e);
    return [];
  }
}

export async function getRecommendedProducts(limit = 10): Promise<HomepageProduct[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  
  try {
    let { data, error } = await supabase
      .from("products")
      .select("id, title, slug, price, images, displayed_rating")
      .or(ACTIVE_PRODUCT_FILTER)
      .order("displayed_rating", { ascending: false })
      .limit(limit);

    if (isMissingIsActiveError(error)) {
      const fallback = await supabase
        .from("products")
        .select("id, title, slug, price, images, displayed_rating")
        .order("displayed_rating", { ascending: false })
        .limit(limit);
      data = fallback.data as any;
      error = fallback.error as any;
    }

    if (error) {
      console.error("Error fetching recommended products:", error);
      return [];
    }

    return (data || []).map((p: HomepageProductRow, i: number) => 
      mapProductToHomepage(p, i % 3 === 0 ? "SALE" : undefined)
    );
  } catch (e) {
    console.error("Exception fetching recommended products:", e);
    return [];
  }
}

export async function getAllProducts(limit = 20): Promise<HomepageProduct[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  
  try {
    let { data, error } = await supabase
      .from("products")
      .select("id, title, slug, price, images, displayed_rating")
      .or(ACTIVE_PRODUCT_FILTER)
      .limit(limit);

    if (isMissingIsActiveError(error)) {
      const fallback = await supabase
        .from("products")
        .select("id, title, slug, price, images, displayed_rating")
        .limit(limit);
      data = fallback.data as any;
      error = fallback.error as any;
    }

    if (error) {
      console.error("Error fetching all products:", error);
      return [];
    }

    return (data || []).map((p: HomepageProductRow) => mapProductToHomepage(p));
  } catch (e) {
    console.error("Exception fetching all products:", e);
    return [];
  }
}
