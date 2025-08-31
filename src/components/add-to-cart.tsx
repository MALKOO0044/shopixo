"use client";

"use client";

import { addItem } from "@/lib/cart-actions";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <Button type="submit" disabled={isDisabled} className="flex-1">
      {disabled ? "Out of Stock" : pending ? "Adding..." : "Add to Cart"}
    </Button>
  );
}

export default function AddToCart({ 
  productId, 
  selectedOptions, 
  disabled = false 
}: { 
  productId: number, 
  selectedOptions: Record<string, string>, 
  disabled?: boolean 
}) {
  const [state, formAction] = useFormState(addItem, null);

  return (
    <form action={formAction} className="mt-6 flex items-stretch gap-4">
      <input type="hidden" name="productId" value={productId} />
      {Object.entries(selectedOptions).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Input
        type="number"
        name="quantity"
        defaultValue={1}
        min={1}
        className="w-20 text-center"
      />
      <SubmitButton disabled={disabled} />
      {state?.error && <p className="mt-2 text-sm text-red-500">{state.error}</p>}
      {state?.success && <p className="mt-2 text-sm text-green-500">{state.success}</p>}
    </form>
  );
}

