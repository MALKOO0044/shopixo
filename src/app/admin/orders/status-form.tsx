"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateOrderStatus, type UpdateOrderState } from "@/app/admin/orders/actions";
import { Button } from "@/components/ui/button";

const initialState: UpdateOrderState = { error: null, success: false };
const statuses = ["pending", "processing", "shipped", "delivered", "cancelled", "paid"] as const;

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} className="ml-2">
      {pending ? "Saving..." : "Save"}
    </Button>
  );
}

export default function OrderStatusForm({ orderId, current }: { orderId: number; current: string }) {
  const [state, formAction] = useFormState(updateOrderStatus, initialState);
  return (
    <form action={formAction} className="inline-flex items-center">
      <input type="hidden" name="id" value={orderId} />
      <select
        name="status"
        defaultValue={current}
        className="rounded border px-2 py-1 text-sm"
        aria-label="Order status"
      >
        {statuses.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <Submit />
      {state?.error && <span className="ml-2 text-xs text-red-600">{state.error}</span>}
      {state?.success && <span className="ml-2 text-xs text-emerald-600">Saved</span>}
    </form>
  );
}
