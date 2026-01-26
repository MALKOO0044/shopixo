"use client";

<<<<<<< HEAD
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
=======
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
      variant="cta"
      size="default"
      aria-label={pending ? "Processing" : "Proceed to Checkout"}
    >
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
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
