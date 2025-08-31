"use client";

import { createCheckoutSession } from "@/lib/checkout-actions";
import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Processing..." : "Proceed to Checkout"}
    </Button>
  );
}

export default function CheckoutButton() {
  return (
    <form action={createCheckoutSession}>
      <SubmitButton />
    </form>
  );
}
