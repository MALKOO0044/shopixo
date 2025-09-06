"use client";

import { useFormState } from "react-dom";
import { deleteProduct } from "@/app/admin/products/actions";

type DeleteState = { error?: string | null; success?: boolean };

const initialState: DeleteState = { error: null, success: false };

export default function DeleteProductButton({ productId, doubleConfirm = false, formId }: { productId: number; doubleConfirm?: boolean; formId?: string }) {
  const [state, formAction] = useFormState(deleteProduct, initialState);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const first = window.confirm("هل أنت متأكد أنك تريد حذف هذا المنتج؟");
    if (!first) {
      e.preventDefault();
      return;
    }
    if (doubleConfirm) {
      const second = window.confirm("تنبيه: هذا الإجراء نهائي ولا يمكن التراجع عنه. هل تريد المتابعة؟");
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
        حذف
      </button>
      {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
