"use client";

import { createCheckoutSession } from "@/lib/checkout-actions";
import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="w-full"
      disabled={pending}
      variant="gradient"
      size="pill"
      aria-label={pending ? "جارٍ المعالجة" : "تابع إتمام الشراء"}
    >
      {pending ? "جارٍ المعالجة..." : "تابع إتمام الشراء"}
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
