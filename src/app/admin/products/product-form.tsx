"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { addProduct, updateProduct } from "@/app/admin/products/actions";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UploadCloud, Loader2 } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { CATEGORIES, labelFromSlug, slugFromLabel } from "@/lib/categories";

function isVideoSrc(s: string): boolean {
  if (!s) return false;
  const str = s.trim().toLowerCase();
  if (str.startsWith('data:video/')) return true;
  if (/\.(mp4|webm|ogg|m3u8)(\?|#|$)/.test(str)) return true;
  if (str.includes('res.cloudinary.com') && str.includes('/video/')) return true;
  // blob: URLs for local previews
  if (str.startsWith('blob:')) return true;
  return false;
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

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
      const supabase = getSupabaseBrowser();
      // Prefer signed uploads via our server API for better security
      let signData: any = null;
      try {
        const signRes = await fetch("/api/cloudinary/sign");
        if (signRes.ok) signData = await signRes.json();
      } catch {}

      const canSigned = !!(signData && signData.ok && signData.cloudName && signData.apiKey && signData.signature && signData.timestamp && signData.uploadPreset);
      const cloudNamePublic = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPresetPublic = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
      const hasUnsigned = !!cloudNamePublic && !!uploadPresetPublic;
      const supabaseReady = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        let uploaded: string | null = null;
        let lastErr: any = null;
        // First preference: direct upload to Supabase Storage from the browser (no server size limits)
        if (supabaseReady && !uploaded) {
          try {
            const now = new Date();
            const y = now.getUTCFullYear();
            const m = String(now.getUTCMonth() + 1).padStart(2, "0");
            const base = `uploads/${y}/${m}/products`;
            const safe = sanitizeFileName(file.name || 'file');
            const ext = safe.includes('.') ? safe.split('.').pop() : 'bin';
            const rnd = Math.random().toString(36).slice(2);
            const path = `${base}/${now.getTime()}-${rnd}.${ext}`;
            const up = await supabase.storage.from('products').upload(path, file, { upsert: true, contentType: file.type || undefined });
            if (!up.error) {
              const pub = supabase.storage.from('products').getPublicUrl(path);
              uploaded = (pub as any)?.data?.publicUrl || (pub as any)?.publicUrl || null;
            } else {
              lastErr = up.error;
            }
          } catch (e) {
            lastErr = e;
          }
        }
        // Fallback A: upload via our API route (will also work for smaller files)
        if (!uploaded) {
          try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("dir", "products");
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            if (res.ok) {
              const j = await res.json();
              if (j?.ok && j?.url) uploaded = j.url as string;
            } else {
              const errTxt = await res.text().catch(() => "");
              lastErr = new Error(`Upload API failed: ${res.status} ${res.statusText} ${errTxt}`);
            }
          } catch (e) {
            lastErr = e;
          }
        }
        // Try signed first if available
        if (canSigned) {
          try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("api_key", String(signData.apiKey));
            fd.append("timestamp", String(signData.timestamp));
            fd.append("upload_preset", String(signData.uploadPreset));
            fd.append("signature", String(signData.signature));
            const kind = file.type.startsWith("video/") ? "video" : "image";
            const res = await fetch(`https://api.cloudinary.com/v1_1/${signData.cloudName}/${kind}/upload`, { method: "POST", body: fd });
            if (!res.ok) {
              const errTxt = await res.text().catch(() => "");
              throw new Error(`Signed upload failed: ${res.status} ${res.statusText} ${errTxt}`);
            }
            const json = await res.json();
            uploaded = (json.secure_url as string) || null;
          } catch (e) {
            lastErr = e;
          }
        }
        // Fallback 1: unsigned using signing response values (covers case where preset is actually unsigned)
        if (!uploaded && signData?.cloudName && signData?.uploadPreset) {
          try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("upload_preset", String(signData.uploadPreset));
            const kind = file.type.startsWith("video/") ? "video" : "image";
            const res = await fetch(`https://api.cloudinary.com/v1_1/${signData.cloudName}/${kind}/upload`, { method: "POST", body: fd });
            if (!res.ok) {
              const errTxt = await res.text().catch(() => "");
              throw new Error(`Unsigned(upload_preset from sign) failed: ${res.status} ${res.statusText} ${errTxt}`);
            }
            const json = await res.json();
            uploaded = (json.secure_url as string) || null;
          } catch (e) {
            lastErr = e;
          }
        }
        // Fallback 2: unsigned using NEXT_PUBLIC vars
        if (!uploaded && hasUnsigned) {
          try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("upload_preset", uploadPresetPublic as string);
            const kind = file.type.startsWith("video/") ? "video" : "image";
            const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudNamePublic}/${kind}/upload`, { method: "POST", body: fd });
            if (!res.ok) {
              const errTxt = await res.text().catch(() => "");
              throw new Error(`Unsigned(NEXT_PUBLIC) failed: ${res.status} ${res.statusText} ${errTxt}`);
            }
            const json = await res.json();
            uploaded = (json.secure_url as string) || null;
          } catch (e) {
            lastErr = e;
          }
        }
        if (uploaded) {
          uploadedUrls.push(uploaded);
        } else {
          // Last resort: local preview only
          const objectUrl = URL.createObjectURL(file);
          onLocalPreview?.([objectUrl]);
          console.error("Image upload failed:", lastErr);
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
  const [uploadConfigured, setUploadConfigured] = useState<boolean | null>(null);
  const [clientError, setClientError] = useState<string>("");
  // Category selection
  const initialCategoryLabel = product?.category || "General";
  const [categorySlug, setCategorySlug] = useState<string>(slugFromLabel(initialCategoryLabel));

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/cloudinary/sign", { cache: "no-store" });
        if (!mounted) return;
        if (res.ok) {
          const j = await res.json();
          setUploadConfigured(!!j?.ok);
        } else {
          setUploadConfigured(false);
        }
      } catch {
        if (mounted) setUploadConfigured(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

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

  const onSubmitForm = (e: React.FormEvent<HTMLFormElement>) => {
    setClientError("");
    const val = imagesInputRef.current?.value?.trim() || "";
    // Prevent submitting products with no real media URLs saved
    if (!val) {
      e.preventDefault();
      setClientError("يجب إضافة صورة أو فيديو واحد على الأقل قبل الحفظ. إذا كانت المعاينة من نوع blob: فلن يتم حفظها، الرجاء رفع الملف أو إدخال رابط مباشر.");
      // Focus the external URL input to guide the user
      try { (document.getElementById("images-ext-url") as HTMLInputElement | null)?.focus(); } catch {}
      return false;
    }
    return true;
  };

  return (
    <form action={formAction} onSubmit={onSubmitForm}>
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
          {/* Hidden field stores the label for consistent DB values */}
          <input type="hidden" name="category" value={labelFromSlug(categorySlug) || initialCategoryLabel} />
          <Select value={categorySlug} onValueChange={(v) => setCategorySlug(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            <span className="text-xs text-muted-foreground">
              ارفع صورًا أو فيديوهات؛ لا حاجة لإدخال روابط يدويًا.
            </span>
          </div>
          {uploadConfigured === false && (
            <div className="text-xs text-amber-600">
              ملاحظة: الرفع غير مُفعّل (لم يتم ضبط Cloudinary). ستظهر معاينات blob: محليًا فقط ولن تُحفظ. أدخل رابطًا مباشرًا أو فعّل متغيرات Cloudinary.
            </div>
          )}
          <div className="mt-2 flex items-center gap-2">
            <Input
              placeholder="أو أدخل رابط صورة/فيديو (https://...)"
              value={extUrl}
              onChange={(e) => setExtUrl(e.target.value)}
              id="images-ext-url"
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
          {!!clientError && <p className="text-xs text-destructive">{clientError}</p>}
          {previews && previews.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {previews.map((src, i) => (
                isVideoSrc(src) ? (
                  <video key={`${src}-${i}`} src={src} className="h-16 w-16 rounded border object-cover" muted playsInline />
                ) : (
                  <img key={`${src}-${i}`} src={src} alt="preview" className="h-16 w-16 rounded border object-cover" />
                )
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
