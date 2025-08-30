"use server";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const productSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  image: z.string().url("Must be a valid URL").optional().or(z.literal('')), 
});

export async function addProduct(prevState: any, formData: FormData) {
  const supabase = createServerComponentClient({ cookies });
  const validatedFields = productSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      message: "Invalid data",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { error } = await supabase.from("products").insert(validatedFields.data);

  if (error) {
    return { message: "Database error: Could not add product.", fieldErrors: null };
  }

  revalidatePath("/admin");
  redirect("/admin");
}

const productUpdateSchema = productSchema.extend({
  id: z.coerce.number(),
});

export async function updateProduct(prevState: any, formData: FormData) {
  const supabase = createServerComponentClient({ cookies });
  const validatedFields = productUpdateSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      message: "Invalid data",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { id, ...productData } = validatedFields.data;

  const { error } = await supabase.from("products").update(productData).eq("id", id);

  if (error) {
    return { message: "Database error: Could not update product.", fieldErrors: null };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/products/${id}/edit`);
  redirect("/admin");
}

const deleteProductSchema = z.object({
  id: z.coerce.number(),
});

export async function deleteProduct(prevState: any, formData: FormData) {
  const supabase = createServerComponentClient({ cookies });
  const validatedFields = deleteProductSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { error: "Invalid product ID." };
  }

  const { id } = validatedFields.data;

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    return { error: "Database error: Could not delete product." };
  }

  revalidatePath("/admin");
  return { success: true };
}
