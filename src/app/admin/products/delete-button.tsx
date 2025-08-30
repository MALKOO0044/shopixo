"use client";

"use client";

import { useFormState } from "react-dom";
import { deleteProduct } from "@/app/admin/products/actions";

type DeleteState = { error?: string | null; success?: boolean };

const initialState: DeleteState = { error: null, success: false };

export default function DeleteProductButton({ productId }: { productId: number }) {
  const [state, formAction] = useFormState(deleteProduct, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm("Are you sure you want to delete this product?")) {
          e.preventDefault();
        }
      }}
      className="inline-block"
    >
      <input type="hidden" name="id" value={productId} />
      <button type="submit" className="text-sm font-medium text-red-600 hover:underline">
        Delete
      </button>
      {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
