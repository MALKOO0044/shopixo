"use server";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function updatePassword(formData: FormData) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/account/security");

  const newPassword = String(formData.get("new_password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");

  if (newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  if (newPassword !== confirmPassword) {
    throw new Error("Passwords do not match.");
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    console.error("updatePassword error", error);
    throw new Error(error.message || "Failed to update password.");
  }
  revalidatePath("/account/security");
}
