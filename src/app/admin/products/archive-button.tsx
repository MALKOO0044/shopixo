"use client";

import { useFormState } from "react-dom";
import { setProductActive } from "@/app/admin/products/actions";

type ToggleState = { error?: string | null; success?: boolean };

const initialState: ToggleState = { error: null, success: false };

export default function ArchiveProductButton({ productId, isActive }: { productId: number; isActive: boolean }) {
  const [state, formAction] = useFormState(setProductActive, initialState);
  const label = isActive ? "Archive" : "Restore";

  return (
    <form action={formAction} className="inline-block">
      <input type="hidden" name="id" value={productId} />
      <input type="hidden" name="is_active" value={(!isActive).toString()} />
      <button
        type="submit"
        className={
          isActive
            ? "text-sm font-medium text-amber-600 hover:underline"
            : "text-sm font-medium text-emerald-600 hover:underline"
        }
      >
        {label}
      </button>
      {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
