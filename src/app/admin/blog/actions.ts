"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null as any;
  return createClient(url, key);
}

async function requireAdmin() {
  const supabaseAuth = createServerComponentClient({ cookies });
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return { allowed: false as const };
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.length === 0) return { allowed: true as const };
  const email = (user.email || "").toLowerCase();
  return { allowed: !!email && adminEmails.includes(email) } as const;
}

const blogSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  excerpt: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  published: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => {
      if (v === undefined) return true;
      if (v === "on" || v === "true" || v === true) return true;
      return false;
    }),
});

const blogUpdateSchema = blogSchema.extend({ id: z.coerce.number() });

export async function addBlogPost(prevState: any, formData: FormData) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.allowed) return { message: "Not authorized", fieldErrors: null };
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return { message: "Server misconfiguration", fieldErrors: null };

  const validated = blogSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validated.success) {
    return { message: "Invalid data", fieldErrors: validated.error.flatten().fieldErrors };
  }

  const data = {
    title: validated.data.title,
    slug: validated.data.slug,
    excerpt: validated.data.excerpt ?? null,
    content: validated.data.content ?? null,
    published: validated.data.published ?? true,
  };

  const { error } = await supabaseAdmin.from("blog_posts").insert(data);
  if (error) {
    console.error("Add blog post failed:", error);
    const friendly = error.code === "23505" ? "Slug already exists." : (error.message || "Database error");
    return { message: friendly, fieldErrors: null };
  }

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  redirect("/admin/blog");
}

export async function updateBlogPost(prevState: any, formData: FormData) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.allowed) return { message: "Not authorized", fieldErrors: null };
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return { message: "Server misconfiguration", fieldErrors: null };

  const validated = blogUpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validated.success) {
    return { message: "Invalid data", fieldErrors: validated.error.flatten().fieldErrors };
  }

  const { id, ...rest } = validated.data;
  const data = {
    title: rest.title,
    slug: rest.slug,
    excerpt: rest.excerpt ?? null,
    content: rest.content ?? null,
    published: rest.published ?? true,
  };

  const { error } = await supabaseAdmin.from("blog_posts").update(data).eq("id", id);
  if (error) {
    console.error("Update blog post failed:", error);
    const friendly = error.code === "23505" ? "Slug already exists." : (error.message || "Database error");
    return { message: friendly, fieldErrors: null };
  }

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  redirect("/admin/blog");
}

export async function deleteBlogPost(prevState: any, formData: FormData) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.allowed) return { error: "Not authorized" };
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return { error: "Server misconfiguration" };

  const id = Number(formData.get("id"));
  if (!id || !Number.isFinite(id)) return { error: "Invalid post id" };

  const { error } = await supabaseAdmin.from("blog_posts").delete().eq("id", id);
  if (error) return { error: "Database error: Could not delete post." };

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  return { success: true };
}
