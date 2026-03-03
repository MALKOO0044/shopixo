"use client";

import { addItem } from "@/lib/cart-actions";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartCount } from "@/components/cart/CartCountProvider";
import { useEffect, useRef } from "react";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <Button
      type="submit"
      disabled={isDisabled}
      variant="gradient"
      size="pill"
      className="w-full sm:w-auto"
      aria-label={disabled ? "Out of Stock" : pending ? "Adding..." : "Add to Cart — Fast & Secure"}
    >
      {disabled ? "Out of Stock" : pending ? "Adding..." : "Add to Cart — Fast & Secure"}
    </Button>
  );
}

export default function AddToCart({ 
  productId,
  productSlug,
  selectedOptions, 
  disabled = false,
  quantity,
  onQuantityChange,
}: { 
  productId: number,
  productSlug?: string,
  selectedOptions: Record<string, string>, 
  disabled?: boolean,
  quantity?: number,
  onQuantityChange?: (q: number) => void,
}) {
  const [state, formAction] = useFormState(addItem, null);
  const { setCount } = useCartCount();
  const prevStateRef = useRef(state);

  useEffect(() => {
    if (state?.success && state !== prevStateRef.current && typeof state.count === 'number') {
      setCount(state.count);
    }
    prevStateRef.current = state;
  }, [state, setCount]);

  return (
    <form action={formAction} className="mt-6 flex items-stretch gap-4">
      <input type="hidden" name="productId" value={productId} />
      {productSlug ? <input type="hidden" name="productSlug" value={productSlug} /> : null}
      {Object.entries(selectedOptions).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Input
        type="number"
        name="quantity"
        value={typeof quantity === 'number' ? quantity : undefined}
        defaultValue={typeof quantity === 'number' ? undefined : 1}
        onChange={onQuantityChange ? (e) => onQuantityChange(Math.max(1, Number(e.currentTarget.value || '1'))) : undefined}
        min={1}
        className="w-20 text-center"
      />
      <SubmitButton disabled={disabled} />
      {state?.error && <p className="mt-2 text-sm text-red-500">{state.error}</p>}
      {state?.success && <p className="mt-2 text-sm text-green-500">{state.success}</p>}
    </form>
  );
}
