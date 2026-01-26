"use server";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function parseIntOrNull(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function updateReview(formData: FormData) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/account/reviews");

  const id = parseIntOrNull(formData.get("id"));
  const rating = parseIntOrNull(formData.get("rating"));
  const titleRaw = String(formData.get("title") || "").trim();
  const bodyRaw = String(formData.get("body") || "").trim();

  if (!id) throw new Error("Invalid review id");
  if (!rating || rating < 1 || rating > 5) throw new Error("Rating must be between 1 and 5");

  const title = titleRaw.length ? titleRaw : null;
  const body = bodyRaw.length ? bodyRaw : null;

  const { error } = await supabase
    .from("reviews")
    .update({ rating, title, body })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("updateReview error", error);
    throw new Error("Failed to update review.");
  }
  revalidatePath("/account/reviews");
}

export async function deleteReview(formData: FormData) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/account/reviews");

  const id = parseIntOrNull(formData.get("id"));
  if (!id) throw new Error("Invalid review id");

  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("deleteReview error", error);
    throw new Error("Failed to delete review.");
  }
  revalidatePath("/account/reviews");
}
