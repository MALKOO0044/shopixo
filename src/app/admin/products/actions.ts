"use server";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const productSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  stock: z.coerce.number().int().min(0, "Stock must be a non-negative integer"),
  // Category is required in DB; default to 'General' if not provided
  category: z
    .string()
    .optional()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : "General")),
  // Accept a comma-separated string from the form and transform it into a string[]
  images: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return [] as string[];
      return val
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }),
});

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function requireAdmin() {
  const supabaseAuth = createServerComponentClient({ cookies });
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return { allowed: false as const };
  }
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.length === 0) {
    // No admin list configured: treat any authenticated user as allowed (dev fallback)
    return { allowed: true as const };
  }
  const email = (user.email || "").toLowerCase();
  return { allowed: !!email && adminEmails.includes(email) } as const;
}

export async function addProduct(prevState: any, formData: FormData) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.allowed) {
    return { message: "Not authorized", fieldErrors: null };
  }
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return { message: "Server misconfiguration: missing Supabase service role envs", fieldErrors: null };
  }
  const validatedFields = productSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      message: "Invalid data",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { error } = await supabaseAdmin.from("products").insert(validatedFields.data);

  if (error) {
    // Provide a clearer, admin-friendly message (e.g., unique violation on slug)
    console.error("Add product failed:", error);
    const friendlyMessage =
      error.code === "23505"
        ? "Slug already exists. Please use a unique slug."
        : error.message || "Database error: Could not add product.";
    return { message: friendlyMessage, fieldErrors: null };
  }

  revalidatePath("/admin");
  redirect("/admin");
}

const productUpdateSchema = productSchema.extend({
  id: z.coerce.number(),
});

export async function updateProduct(prevState: any, formData: FormData) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.allowed) {
    return { message: "Not authorized", fieldErrors: null };
  }
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return { message: "Server misconfiguration: missing Supabase service role envs", fieldErrors: null };
  }
  const validatedFields = productUpdateSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      message: "Invalid data",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { id, ...productData } = validatedFields.data;

  const { error } = await supabaseAdmin.from("products").update(productData).eq("id", id);

  if (error) {
    console.error("Update product failed:", error);
    const friendlyMessage =
      error.code === "23505"
        ? "Slug already exists. Please use a unique slug."
        : error.message || "Database error: Could not update product.";
    return { message: friendlyMessage, fieldErrors: null };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/products/${id}/edit`);
  redirect("/admin");
}

const deleteProductSchema = z.object({
  id: z.coerce.number(),
});

export async function deleteProduct(prevState: any, formData: FormData) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.allowed) {
    return { error: "Not authorized" };
  }
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return { error: "Server misconfiguration: missing Supabase service role envs" };
  }
  const validatedFields = deleteProductSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { error: "Invalid product ID." };
  }

  const { id } = validatedFields.data;

  const { error } = await supabaseAdmin.from("products").delete().eq("id", id);

  if (error) {
    return { error: "Database error: Could not delete product." };
  }

  revalidatePath("/admin");
  return { success: true };
}
