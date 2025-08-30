import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

async function clearCart() {
  "use server";
  const supabase = createServerComponentClient({ cookies });
  const cartId = cookies().get("cart_id")?.value;

  if (cartId) {
    await supabase.from("cart_items").delete().eq("session_id", cartId);
    cookies().delete("cart_id");
  }
}

export default async function SuccessPage() {
  await clearCart();

  return (
    <div className="container flex flex-col items-center justify-center py-20 text-center">
      <CheckCircle className="h-16 w-16 text-green-500" />
      <h1 className="mt-4 text-3xl font-bold">Thank you for your order!</h1>
      <p className="mt-2 text-slate-600">
        Your payment was successful. A confirmation email has been sent to you.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Continue Shopping
      </Link>
    </div>
  );
}
