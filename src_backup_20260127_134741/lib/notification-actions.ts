"use server";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function boolFromForm(value: FormDataEntryValue | null): boolean {
  if (!value) return false;
  const v = String(value).toLowerCase();
  return v === "true" || v === "on" || v === "1";
}

export async function updateNotifications(formData: FormData) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/account/notifications");

  const order_updates = boolFromForm(formData.get("order_updates"));
  const promotions = boolFromForm(formData.get("promotions"));
  const product_updates = boolFromForm(formData.get("product_updates"));

  const { error } = await supabase.auth.updateUser({
    data: {
      notifications: {
        order_updates,
        promotions,
        product_updates,
      },
    },
  });

  if (error) {
    console.error("updateNotifications error", error);
    throw new Error(error.message || "Failed to update notifications");
  }

  revalidatePath("/account/notifications");
}
