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

export async function createAddress(formData: FormData) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/account/addresses");

  const full_name = String(formData.get("full_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const line1 = String(formData.get("line1") || "").trim();
  const line2Raw = String(formData.get("line2") || "").trim();
  const line2 = line2Raw.length ? line2Raw : null;
  const city = String(formData.get("city") || "").trim();
  const stateRaw = String(formData.get("state") || "").trim();
  const state = stateRaw.length ? stateRaw : null;
  const postal_codeRaw = String(formData.get("postal_code") || "").trim();
  const postal_code = postal_codeRaw.length ? postal_codeRaw : null;
  const country = String(formData.get("country") || "").trim();
  const is_default = boolFromForm(formData.get("is_default"));

  if (!full_name || !line1 || !city || !country) {
    throw new Error("Please provide full name, address line 1, city and country.");
  }

  if (is_default) {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
  }

  const { error } = await supabase.from("addresses").insert({
    user_id: user.id,
    full_name,
    phone,
    line1,
    line2,
    city,
    state,
    postal_code,
    country,
    is_default,
  });

  if (error) {
    console.error("createAddress error", error);
    throw new Error("Failed to create address.");
  }
  revalidatePath("/account/addresses");
}

export async function updateAddress(formData: FormData) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/account/addresses");

  const id = Number(formData.get("id"));
  if (!id) throw new Error("Invalid address id");

  const full_name = String(formData.get("full_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const line1 = String(formData.get("line1") || "").trim();
  const line2Raw = String(formData.get("line2") || "").trim();
  const line2 = line2Raw.length ? line2Raw : null;
  const city = String(formData.get("city") || "").trim();
  const stateRaw = String(formData.get("state") || "").trim();
  const state = stateRaw.length ? stateRaw : null;
  const postal_codeRaw = String(formData.get("postal_code") || "").trim();
  const postal_code = postal_codeRaw.length ? postal_codeRaw : null;
  const country = String(formData.get("country") || "").trim();
  const is_default = boolFromForm(formData.get("is_default"));

  if (!full_name || !line1 || !city || !country) {
    throw new Error("Please provide full name, address line 1, city and country.");
  }

  if (is_default) {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
  }

  const { error } = await supabase
    .from("addresses")
    .update({
      full_name,
      phone,
      line1,
      line2,
      city,
      state,
      postal_code,
      country,
      is_default,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("updateAddress error", error);
    throw new Error("Failed to update address.");
  }
  revalidatePath("/account/addresses");
}

export async function deleteAddress(formData: FormData) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/account/addresses");

  const id = Number(formData.get("id"));
  if (!id) throw new Error("Invalid address id");

  // If this is default, pick another as default afterwards.
  const { data: addr } = await supabase
    .from("addresses")
    .select("id,is_default")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  const { error } = await supabase.from("addresses").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    console.error("deleteAddress error", error);
    throw new Error("Failed to delete address.");
  }

  if (addr?.is_default) {
    const { data: other } = await supabase
      .from("addresses")
      .select("id")
      .eq("user_id", user.id)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (other?.id) {
      await supabase.from("addresses").update({ is_default: true }).eq("id", other.id);
    }
  }
  revalidatePath("/account/addresses");
}

export async function setDefaultAddress(formData: FormData) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/account/addresses");

  const id = Number(formData.get("id"));
  if (!id) throw new Error("Invalid address id");

  await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
  const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id).eq("user_id", user.id);
  if (error) {
    console.error("setDefaultAddress error", error);
    throw new Error("Failed to set default address.");
  }
  revalidatePath("/account/addresses");
}
