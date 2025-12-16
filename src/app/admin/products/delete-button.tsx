"use client";

import { useFormState } from "react-dom";
import { deleteProduct } from "@/app/admin/products/actions";

type DeleteState = { error: string | null; success: boolean };

const initialState: DeleteState = { error: null, success: false };

export default function DeleteProductButton({ productId, doubleConfirm = false, formId }: { productId: number; doubleConfirm?: boolean; formId?: string }) {
  const [state, formAction] = useFormState<DeleteState, FormData>(deleteProduct as any, initialState);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const first = window.confirm("Are you sure you want to delete this product?");
    if (!first) {
      e.preventDefault();
      return;
    }
    if (doubleConfirm) {
      const second = window.confirm("Warning: This action is permanent and cannot be undone. Do you want to proceed?");
      if (!second) {
        e.preventDefault();
        return;
      }
    }
  }

  return (
    <form id={formId} action={formAction} onSubmit={handleSubmit} className="inline-block">
      <input type="hidden" name="id" value={productId} />
      <button type="submit" className="text-sm font-medium text-red-600 hover:underline">
        Delete
      </button>
      {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
