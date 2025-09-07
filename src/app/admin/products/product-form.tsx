"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useRef, useState } from "react";
import { addProduct, updateProduct } from "@/app/admin/products/actions";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UploadCloud, Loader2 } from "lucide-react";

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (isEditing ? "Updating..." : "Adding...") : (isEditing ? "Update Product" : "Add Product")}
    </Button>
  );
}

function UploadImagesControl({
  onAppendUrls,
  onLocalPreview,
}: {
  onAppendUrls: (urls: string[]) => void;
  onLocalPreview?: (urls: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onClick = () => fileInputRef.current?.click();

  async function handleFiles(files: FileList) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      // Prefer signed uploads via our server API for better security
      let signData: any = null;
      try {
        const signRes = await fetch("/api/cloudinary/sign");
        if (signRes.ok) signData = await signRes.json();
      } catch {}

      const canSigned = !!(signData && signData.ok && signData.cloudName && signData.apiKey && signData.signature && signData.timestamp && signData.uploadPreset);

      const uploadedUrls: string[] = [];
      if (canSigned) {
        for (const file of Array.from(files)) {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("api_key", String(signData.apiKey));
          fd.append("timestamp", String(signData.timestamp));
          fd.append("upload_preset", String(signData.uploadPreset));
          fd.append("signature", String(signData.signature));
          const kind = file.type.startsWith("video/") ? "video" : "image";
          const res = await fetch(`https://api.cloudinary.com/v1_1/${signData.cloudName}/${kind}/upload`, {
            method: "POST",
            body: fd,
          });
          if (!res.ok) throw new Error("Upload failed");
          const json = await res.json();
          if (json.secure_url) uploadedUrls.push(json.secure_url as string);
        }
      } else {
        // Fallback to unsigned preset if public envs exist
        const cloudNamePublic = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPresetPublic = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        const hasUnsigned = !!cloudNamePublic && !!uploadPresetPublic;
        if (hasUnsigned) {
          for (const file of Array.from(files)) {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("upload_preset", uploadPresetPublic as string);
            const kind = file.type.startsWith("video/") ? "video" : "image";
            const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudNamePublic}/${kind}/upload`, {
              method: "POST",
              body: fd,
            });
            if (!res.ok) throw new Error("Upload failed");
            const json = await res.json();
            if (json.secure_url) uploadedUrls.push(json.secure_url as string);
          }
        } else {
          // Final fallback: just preview locally
          const objectUrls = Array.from(files).map((f) => URL.createObjectURL(f));
          onLocalPreview?.(objectUrls);
          alert("Media upload is not configured. Configure Cloudinary env vars to enable uploads.");
        }
      }

      if (uploadedUrls.length > 0) onAppendUrls(uploadedUrls);
    } catch (e) {
      console.error("Image upload failed", e);
      alert("Image upload failed. You can paste direct image URLs or configure Cloudinary env vars.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="secondary" onClick={onClick} disabled={uploading} aria-live="polite">
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
          </>
        ) : (
          <>
            <UploadCloud className="mr-2 h-4 w-4" /> Upload Media
          </>
        )}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
    </div>
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
  const imagesInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>(product?.images || []);
  const [extUrl, setExtUrl] = useState<string>("");

  const appendUrls = (urls: string[]) => {
    const current = imagesInputRef.current?.value?.trim();
    const arr = current ? current.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const newArr = Array.from(new Set([...arr, ...urls]));
    if (imagesInputRef.current) {
      imagesInputRef.current.value = newArr.join(", ");
    }
    setPreviews((prev) => Array.from(new Set([...(prev || []), ...urls])));
  };

  const onLocalPreview = (urls: string[]) => {
    setPreviews((prev) => Array.from(new Set([...(prev || []), ...urls])));
  };

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
          <Label htmlFor="category">Category</Label>
          <Input id="category" name="category" defaultValue={product?.category || "General"} />
          {state.fieldErrors?.category && (
            <p className="text-xs text-destructive">{state.fieldErrors.category.join(', ')}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label>صور/فيديو المنتج</Label>
          {/* نُخفي الحقل النصي ونملؤه تلقائيًا عند الرفع */}
          <Input ref={imagesInputRef} id="images" name="images" defaultValue={product?.images?.join(', ') || ""} className="hidden" />
          <div className="flex items-center gap-3">
            <UploadImagesControl onAppendUrls={appendUrls} onLocalPreview={onLocalPreview} />
            <span className="text-xs text-muted-foreground">ارفع صورًا أو فيديوهات؛ لا حاجة لإدخال روابط يدويًا.</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Input
              placeholder="أو أدخل رابط صورة/فيديو (https://...)"
              value={extUrl}
              onChange={(e) => setExtUrl(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const url = (extUrl || "").trim();
                if (!url) return;
                appendUrls([url]);
                setExtUrl("");
              }}
            >
              إضافة الرابط
            </Button>
          </div>
          {previews && previews.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <img key={`${src}-${i}`} src={src} alt="preview" className="h-16 w-16 rounded border object-cover" />
              ))}
            </div>
          )}
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
