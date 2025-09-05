import Link from "next/link";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { updateReview, deleteReview } from "@/lib/review-actions";
import SubmitButton from "@/components/submit-button";
import ConfirmSubmitButton from "@/components/confirm-submit-button";
import FormStatusToast from "@/components/form-status-toast";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type JoinedReview = {
  id: number;
  user_id: string;
  product_id: number;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
  product?: { id: number; slug: string; title: string } | null;
};

async function getUserReviews(userId: string): Promise<JoinedReview[]> {
  const supabase = createServerComponentClient({ cookies });
  const { data: reviewsData, error: revErr } = await supabase
    .from("reviews")
    .select("id,user_id,product_id,rating,title,body,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (revErr) {
    console.error("getUserReviews error", revErr);
    return [];
  }
  const reviews = (reviewsData || []) as Array<{
    id: number; user_id: string; product_id: number; rating: number; title: string | null; body: string | null; created_at: string;
  }>;

  const productIds = Array.from(new Set(reviews.map(r => r.product_id)));
  let productMap = new Map<number, { id: number; slug: string; title: string }>();
  if (productIds.length > 0) {
    const { data: productsData, error: prodErr } = await supabase
      .from("products")
      .select("id,slug,title")
      .in("id", productIds);
    if (prodErr) {
      console.warn("Failed to fetch products for reviews", prodErr);
    } else {
      for (const p of productsData as any[]) {
        productMap.set(p.id as number, { id: p.id as number, slug: String(p.slug), title: String(p.title) });
      }
    }
  }

  return reviews.map(r => ({ ...r, product: productMap.get(r.product_id) || null }));
}

export default async function ReviewsPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/account/reviews");

  const reviews = await getUserReviews(user.id);

  return (
    <div dir="rtl" className="max-w-3xl mx-auto py-12 px-4 text-right">
      <h1 className="text-2xl font-bold mb-6">مراجعاتي</h1>

      {reviews.length === 0 ? (
        <div className="rounded-lg border bg-white p-6">
          <p className="text-gray-600">لا توجد مراجعات بعد. يمكنك كتابة مراجعة من صفحة المنتج بعد الشراء.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => {
            const product = r.product || null;
            const dateStr = format(new Date(r.created_at), "d MMMM yyyy", { locale: arSA });
            return (
              <li key={r.id} className="rounded-lg border bg-white p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {product ? (
                        <Link href={{ pathname: `/product/${product.slug}` }} className="hover:underline">
                          {product.title}
                        </Link>
                      ) : (
                        <span>منتج غير معروف</span>
                      )}
                    </h2>
                    <p className="text-sm text-gray-600">{dateStr}</p>
                  </div>
                  <div className="text-yellow-500 font-semibold" aria-label={`التقييم ${r.rating} من 5`}>
                    {"★".repeat(r.rating)}<span className="text-gray-300">{"★".repeat(5 - r.rating)}</span>
                  </div>
                </div>

                {r.title && <p className="mt-3 font-medium">{r.title}</p>}
                {r.body && <p className="mt-1 text-gray-700 whitespace-pre-wrap">{r.body}</p>}

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-700 hover:text-black">تعديل المراجعة</summary>
                  <form action={updateReview} className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="hidden" name="id" value={String(r.id)} />
                    <div>
                      <label className="block text-sm font-medium mb-1">التقييم</label>
                      <select name="rating" required defaultValue={String(r.rating)} className="w-full rounded border px-3 py-2">
                        <option value="5">5</option>
                        <option value="4">4</option>
                        <option value="3">3</option>
                        <option value="2">2</option>
                        <option value="1">1</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">العنوان (اختياري)</label>
                      <input name="title" defaultValue={r.title ?? ""} className="w-full rounded border px-3 py-2" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-1">نص المراجعة (اختياري)</label>
                      <textarea name="body" defaultValue={r.body ?? ""} rows={4} className="w-full rounded border px-3 py-2" />
                    </div>
                    <div className="sm:col-span-2">
                      <div className="flex items-center gap-2">
                        <SubmitButton label="حفظ التغييرات" pendingLabel="جارٍ الحفظ..." />
                      </div>
                      <FormStatusToast successMessage="تم حفظ التغييرات" />
                    </div>
                  </form>
                  <form action={deleteReview} className="mt-2 flex items-center justify-end">
                    <input type="hidden" name="id" value={String(r.id)} />
                    <ConfirmSubmitButton label="حذف" pendingLabel="جارٍ الحذف..." confirmMessage="هل أنت متأكد من حذف هذه المراجعة؟" className="px-3 py-2 text-sm" />
                    <FormStatusToast successMessage="تم حذف المراجعة" />
                  </form>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
