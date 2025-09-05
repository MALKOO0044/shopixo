"use server";

import { z } from "zod";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function requireAdmin() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allowed: false as const };
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.length === 0) return { allowed: true as const };
  const email = (user.email || "").toLowerCase();
  return { allowed: !!email && adminEmails.includes(email) } as const;
}

const statusEnum = z.enum(["pending", "processing", "shipped", "delivered", "cancelled", "paid"]);

const updateSchema = z.object({
  id: z.coerce.number(),
  status: statusEnum,
});

export type UpdateOrderState = { error?: string | null; success?: boolean };

export async function updateOrderStatus(prev: UpdateOrderState, formData: FormData): Promise<UpdateOrderState> {
  const admin = await requireAdmin();
  if (!admin.allowed) return { error: "Not authorized" };
  const client = getSupabaseAdmin();
  if (!client) return { error: "Server misconfiguration" };

  const parse = updateSchema.safeParse({ id: formData.get("id"), status: formData.get("status") });
  if (!parse.success) return { error: "Invalid input" };
  const { id, status } = parse.data;

  const { error } = await client.from("orders").update({ status }).eq("id", id);
  if (error) {
    console.error("updateOrderStatus error", error);
    return { error: "Database error" };
  }
  revalidatePath("/admin/orders");
  return { success: true };
}
