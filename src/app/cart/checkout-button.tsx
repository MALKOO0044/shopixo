"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function CheckoutButton() {
  const router = useRouter();

  return (
    <Button
      type="button"
      className="w-full"
      variant="cta"
      size="default"
      onClick={() => router.push("/checkout")}
      aria-label="Proceed to Checkout"
    >
      Proceed to Checkout
    </Button>
  );
}
