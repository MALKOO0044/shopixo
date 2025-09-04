"use client";

"use client";

import { useFormState, useFormStatus } from "react-dom";
import { addProduct, updateProduct } from "@/app/admin/products/actions";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (isEditing ? "Updating..." : "Adding...") : (isEditing ? "Update Product" : "Add Product")}
    </Button>
  );
}

type FormState = {
  message: string | null;
  fieldErrors: Record<string, string[] | undefined> | null;
};

const initialState: FormState = { message: null, fieldErrors: null };

export default function ProductForm({ product }: { product?: Product }) {
  const action = product ? updateProduct : addProduct;
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction}>
      {product && <input type="hidden" name="id" value={product.id} />}
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" defaultValue={product?.title} required />
          {state.fieldErrors?.title && <p className="text-xs text-destructive">{state.fieldErrors.title.join(', ')}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" defaultValue={product?.slug} required />
          {state.fieldErrors?.slug && <p className="text-xs text-destructive">{state.fieldErrors.slug.join(', ')}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" defaultValue={product?.description || ""} />
          {state.fieldErrors?.description && <p className="text-xs text-destructive">{state.fieldErrors.description.join(', ')}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="price">Price</Label>
          <Input id="price" name="price" type="number" step="0.01" defaultValue={product?.price} required />
          {state.fieldErrors?.price && <p className="text-xs text-destructive">{state.fieldErrors.price.join(', ')}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="stock">Stock</Label>
          <Input id="stock" name="stock" type="number" step="1" min="0" defaultValue={product?.stock ?? 0} required />
          {state.fieldErrors?.stock && <p className="text-xs text-destructive">{state.fieldErrors.stock.join(', ')}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="images">Image URLs (comma-separated)</Label>
          <Input id="images" name="images" defaultValue={product?.images?.join(', ') || ""} />
          {state.fieldErrors?.images && <p className="text-xs text-destructive">{state.fieldErrors.images.join(', ')}</p>}
        </div>
      </div>
      <div className="mt-6">
        <SubmitButton isEditing={!!product} />
        {state.message && !state.fieldErrors && <p className="mt-2 text-sm text-destructive">{state.message}</p>}
      </div>
    </form>
  );
}
