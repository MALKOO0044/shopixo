"use server";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { CartItem, Product } from "./types";
export type { CartItem };

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const addItemSchema = z.object({
  productId: z.number(),
  quantity: z.number().min(1),
});

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
      cookies().set("cart_id", cart.id, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
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
  }));

  return { items: cartItems, error: null };
}

export async function addItem(prevState: any, formData: FormData) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return { error: "Server misconfiguration." };
  }
  const validatedFields = addItemSchema.safeParse({
    productId: Number(formData.get("productId")),
    quantity: Number(formData.get("quantity")),
  });

  if (!validatedFields.success) {
    return { error: "Invalid input." };
  }

  const { productId, quantity } = validatedFields.data;

  try {
    // 1. Fetch product stock
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("stock, title, is_active")
      .eq("id", productId)
      .single();

    if (!product) {
      return { error: "Product not found." };
    }
    if (product.is_active === false) {
      return { error: `This product is no longer available.` };
    }

    const cart = await getOrCreateCart();

    // Check if item already exists in cart
    const { data: existingItem } = await supabaseAdmin
      .from("cart_items")
      .select("id, quantity")
      .eq("session_id", cart.id)
      .eq("product_id", productId)
      .single();

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;

      // 2a. Check stock before updating
      if (newQuantity > product.stock) {
        return { error: `Not enough stock for ${product.title}. Only ${product.stock} left.` };
      }

      const { error } = await supabaseAdmin
        .from("cart_items")
        .update({ quantity: newQuantity })
        .eq("id", existingItem.id);
      if (error) throw error;
    } else {
      // 2b. Check stock before inserting
      if (quantity > product.stock) {
        return { error: `Not enough stock for ${product.title}. Only ${product.stock} left.` };
      }

      // Insert new item
      const { error } = await supabaseAdmin
        .from("cart_items")
        .insert({ session_id: cart.id, product_id: productId, quantity });
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
        .select("id, product_id")
        .eq("id", itemId)
        .eq("session_id", cartId)
        .single();
      if (itemErr || !itemRow) {
        return { error: "Cart item not found." };
      }

      const { data: product, error: prodErr } = await supabaseAdmin
        .from("products")
        .select("stock, title, is_active")
        .eq("id", itemRow.product_id)
        .single();
      if (prodErr || !product) {
        return { error: "Product not found." };
      }
      if (product.is_active === false) {
        return { error: `This product is no longer available.` };
      }
      if (quantity > product.stock) {
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
