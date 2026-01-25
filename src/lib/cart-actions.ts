"use server";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { CartItem, Product } from "./types";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Fetch product with graceful fallback if `is_active` column is missing (pre-migration)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getProductById(admin: any, id: number) {
  // Try selecting with is_active first
  const { data, error } = await admin
    .from("products")
    .select("id, stock, title, is_active")
    .eq("id", id)
    .single();

  if (error && (String((error as any).message || "").includes("is_active") || (error as any).code === "42703")) {
    const fb = await admin
      .from("products")
      .select("id, stock, title")
      .eq("id", id)
      .single();
    return (fb.data as any) ?? null;
  }

  return (data as any) ?? null;
}

const addItemSchema = z.object({
  productId: z.number(),
  quantity: z.number().min(1),
  productSlug: z.string().min(1).optional(),
});

function parseSelectedOption(formData: FormData): { name: string; value: string } | null {
  const known = new Set(["productId", "quantity", "productSlug"]);
  for (const [k, v] of formData.entries()) {
    if (known.has(k)) continue;
    const val = typeof v === "string" ? v : String(v);
    const clean = val.trim();
    if (clean.length > 0) {
      return { name: k, value: clean };
    }
  }
  return null;
}

async function getOrCreateCart() {
  const supabaseAuth = createServerComponentClient({ cookies });
  const { data: { user } } = await supabaseAuth.auth.getUser();
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    throw new Error("Could not create a cart.");
  }

  // If user is logged in, try to find their existing cart
  if (user) {
    const { data: cart, error } = await supabaseAdmin
      .from('cart_sessions')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    if (cart) {
      // Set cookie and return existing cart ID
      cookies().set("cart_id", cart.id, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === 'production',
      });
      return { id: cart.id };
    }
  }

  const cartId = cookies().get("cart_id")?.value;

  if (cartId) {
    const { data: cart } = await supabaseAdmin
      .from("cart_sessions")
      .select("id, user_id")
      .eq("id", cartId)
      .single();
    if (cart) {
        // If user is now logged in, associate the cart with them
        if (user && !cart.user_id) {
          await supabaseAdmin.from('cart_sessions').update({ user_id: user.id }).eq('id', cart.id);
        }
        return { id: cart.id };
    }
  }

  // If no cart_id cookie or cart not found, create a new one
  const { data: newCart, error } = await supabaseAdmin
    .from("cart_sessions")
    .insert({ user_id: user?.id })
    .select("id")
    .single();

  if (error || !newCart) {
    throw new Error("Could not create a cart.");
  }

  cookies().set("cart_id", newCart.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  return newCart;
}

export async function getCart() {
  const cartId = cookies().get("cart_id")?.value;

  if (!cartId) {
    return [];
  }
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    console.warn("getCart: Supabase service role env vars missing; returning empty cart.");
    return [];
  }

  const { data: items, error } = await supabaseAdmin
    .from("cart_items")
    .select(`
      id,
      quantity,
      variant_id,
      variant:product_variants (*),
      products (*)
    `)
    .eq("session_id", cartId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching cart:", error);
    return [];
  }

  if (!items) {
    return [];
  }

  const cartItems = items.map((item: any) => ({
    id: item.id,
    quantity: item.quantity,
    product: item.products, // Supabase returns 'products', so we map it to 'product'
    variant: item.variant ?? null,
  }));

  return cartItems as CartItem[];
}

export async function getCartItemsBySessionId(cartSessionId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    console.warn("getCartItemsBySessionId: Supabase service role env vars missing; returning empty list.");
    return { items: [], error: null };
  }

  const { data: items, error } = await supabaseAdmin
    .from("cart_items")
    .select(`
      id,
      quantity,
      variant_id,
      variant:product_variants (*),
      products (*)
    `)
    .eq("session_id", cartSessionId);

  if (error) {
    console.error("Error fetching cart items by session ID:", error);
    return { items: null, error };
  }

  if (!items) {
    return { items: [], error: null };
  }

  const cartItems: CartItem[] = items.map((item: any) => ({
    id: item.id,
    quantity: item.quantity,
    product: item.products as Product,
    variant: (item.variant as any) ?? null,
  }));

  return { items: cartItems, error: null };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getProductBySlug(admin: any, slug: string) {
  const { data, error } = await admin
    .from("products")
    .select("id, stock, title, is_active")
    .eq("slug", slug)
    .single();

  if (error && (String((error as any).message || "").includes("is_active") || (error as any).code === "42703")) {
    const fb = await admin
      .from("products")
      .select("id, stock, title")
      .eq("slug", slug)
      .single();
    return (fb.data as any) ?? null;
  }
  return (data as any) ?? null;
}

export async function addItem(prevState: any, formData: FormData) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return { error: "Server misconfiguration." };
  }
  const validatedFields = addItemSchema.safeParse({
    productId: Number(formData.get("productId")),
    quantity: Number(formData.get("quantity")),
    productSlug: (() => {
      const v = formData.get("productSlug");
      return typeof v === "string" && v.trim().length > 0 ? v : undefined;
    })(),
  });

  if (!validatedFields.success) {
    return { error: "Invalid input." };
  }

  let { productId, quantity, productSlug } = validatedFields.data;
  const selected = parseSelectedOption(formData); // e.g., { name: "Size", value: "L" }

  try {
    // 1. Fetch product and optional variant
    let product = await getProductById(supabaseAdmin, productId);
    if (!product && productSlug) {
      const bySlug = await getProductBySlug(supabaseAdmin, productSlug);
      if (bySlug) {
        product = bySlug;
        productId = bySlug.id as number; // normalize id for subsequent operations
      }
    }

    if (!product) {
      return { error: "Product not found." };
    }
    if (Object.prototype.hasOwnProperty.call(product, "is_active") && (product as any).is_active === false) {
      return { error: `This product is no longer available.` };
    }

    // Try resolve variant_id if option provided
    let variantRow: any = null;
    if (selected) {
      const { data: vrow } = await supabaseAdmin
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .eq("option_name", selected.name)
        .eq("option_value", selected.value)
        .maybeSingle();
      variantRow = vrow ?? null;
    }

    const cart = await getOrCreateCart();

    // Check if item already exists in cart
    let existingItem: any = null;
    if (variantRow && variantRow.id) {
      const { data } = await supabaseAdmin
        .from("cart_items")
        .select("id, quantity")
        .eq("session_id", cart.id)
        .eq("product_id", productId)
        .eq("variant_id", variantRow.id)
        .maybeSingle();
      existingItem = data ?? null;
    } else {
      const { data } = await supabaseAdmin
        .from("cart_items")
        .select("id, quantity")
        .eq("session_id", cart.id)
        .eq("product_id", productId)
        .is("variant_id", null)
        .maybeSingle();
      existingItem = data ?? null;
    }

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;

      // 2a. Check stock before updating
      if (variantRow && typeof variantRow.stock === 'number') {
        if (newQuantity > variantRow.stock) {
          return { error: `الكمية المطلوبة غير متوفرة للمقاس ${variantRow.option_value}. المتبقي ${variantRow.stock}.` };
        }
      } else if (newQuantity > product.stock) {
        return { error: `Not enough stock for ${product.title}. Only ${product.stock} left.` };
      }

      const { error } = await supabaseAdmin
        .from("cart_items")
        .update({ quantity: newQuantity })
        .eq("id", existingItem.id);
      if (error) throw error;
    } else {
      // 2b. Check stock before inserting
      if (variantRow && typeof variantRow.stock === 'number') {
        if (quantity > variantRow.stock) {
          return { error: `الكمية المطلوبة غير متوفرة للمقاس ${variantRow.option_value}. المتبقي ${variantRow.stock}.` };
        }
      } else if (quantity > product.stock) {
        return { error: `Not enough stock for ${product.title}. Only ${product.stock} left.` };
      }

      // Insert new item
      const insertPayload: any = { session_id: cart.id, product_id: productId, quantity };
      if (variantRow && variantRow.id) insertPayload.variant_id = variantRow.id;
      const { error } = await supabaseAdmin
        .from("cart_items")
        .insert(insertPayload);
      if (error) throw error;
    }

    revalidatePath("/cart");
    revalidatePath("/");

    return { success: "Item added to cart." };
  } catch (e) {
    console.error(e);
    return { error: "An unexpected error occurred." };
  }
}

export async function clearCart() {
  const cartId = cookies().get("cart_id")?.value;

  if (!cartId) return { success: true };

  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return { success: false };
    }
    const { error } = await supabaseAdmin
      .from("cart_items")
      .delete()
      .eq("session_id", cartId);
    if (error) throw error;
    revalidatePath("/cart");
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "An unexpected error occurred." };
  }
}

const updateItemSchema = z.object({
  itemId: z.number(),
  quantity: z.number().min(0),
});

export async function updateItemQuantity(prevState: any, formData: FormData) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return { error: "Server misconfiguration." };
  }
  const validatedFields = updateItemSchema.safeParse({
    itemId: Number(formData.get("itemId")),
    quantity: Number(formData.get("quantity")),
  });

  if (!validatedFields.success) {
    return { error: "Invalid input." };
  }

  const { itemId, quantity } = validatedFields.data;
  const cartId = cookies().get("cart_id")?.value;

  if (!cartId) return { error: "Cart not found." };

  try {
    if (quantity === 0) {
      // Remove item if quantity is 0
      const { error } = await supabaseAdmin
        .from("cart_items")
        .delete()
        .eq("id", itemId)
        .eq("session_id", cartId);
      if (error) throw error;
    } else {
      // Validate stock before updating quantity
      const { data: itemRow, error: itemErr } = await supabaseAdmin
        .from("cart_items")
        .select("id, product_id, variant_id")
        .eq("id", itemId)
        .eq("session_id", cartId)
        .single();
      if (itemErr || !itemRow) {
        return { error: "Cart item not found." };
      }

      const product = await getProductById(supabaseAdmin, itemRow.product_id as number);
      if (!product) {
        return { error: "Product not found." };
      }
      if (Object.prototype.hasOwnProperty.call(product, "is_active") && (product as any).is_active === false) {
        return { error: `This product is no longer available.` };
      }
      if (typeof itemRow.variant_id === 'number') {
        const { data: vrow } = await supabaseAdmin
          .from("product_variants")
          .select("stock, option_value")
          .eq("id", itemRow.variant_id)
          .single();
        const vstock = (vrow as any)?.stock ?? 0;
        if (quantity > vstock) {
          return { error: `الكمية المطلوبة غير متوفرة للمقاس ${(vrow as any)?.option_value ?? ''}. المتبقي ${vstock}.` };
        }
      } else if (quantity > product.stock) {
        return { error: `Not enough stock for ${product.title}. Only ${product.stock} left.` };
      }

      // Update quantity
      const { error } = await supabaseAdmin
        .from("cart_items")
        .update({ quantity })
        .eq("id", itemId)
        .eq("session_id", cartId);
      if (error) throw error;
    }

    revalidatePath("/cart");
    return { success: "Cart updated." };
  } catch (e) {
    console.error(e);
    return { error: "An unexpected error occurred." };
  }
}

const removeItemSchema = z.object({
  itemId: z.number(),
});

export async function removeItem(prevState: any, formData: FormData) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return { error: "Server misconfiguration." };
  }
  const validatedFields = removeItemSchema.safeParse({
    itemId: Number(formData.get("itemId")),
  });

  if (!validatedFields.success) {
    return { error: "Invalid input." };
  }

  const { itemId } = validatedFields.data;
  const cartId = cookies().get("cart_id")?.value;

  if (!cartId) return { error: "Cart not found." };

  try {
    const { error } = await supabaseAdmin
      .from("cart_items")
      .delete()
      .eq("id", itemId)
      .eq("session_id", cartId);

    if (error) throw error;

    revalidatePath("/cart");
    return { success: "Item removed." };
  } catch (e) {
    console.error(e);
    return { error: "An unexpected error occurred." };
  }
}
