import ProductCard from "@/components/product-card"
import Breadcrumbs from "@/components/breadcrumbs"
import { getSupabaseAnonServer } from "@/lib/supabase-server"
import type { Product } from "@/lib/types"

export const metadata = { title: "وصل حديثًا", description: "أحدث المنتجات المضافة إلى المتجر" }
export const revalidate = 60
export const dynamic = "force-dynamic"

export default async function NewArrivalsPage() {
  const supabase = getSupabaseAnonServer()
  let products: any[] | null = null
  if (!supabase) {
    products = []
  } else {
    try {
      // Prefer created_at if present; fallback to id desc
      let { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false })
      if (error && (error as any).code === "42703") {
        const fb = await supabase.from("products").select("*").order("id", { ascending: false })
        data = fb.data as any
      }
      products = (data as any[] | null) ?? []
    } catch {
      products = []
    }
  }

  return (
    <div className="container py-10">
      <Breadcrumbs items={[{ name: "الرئيسية", href: "/" }, { name: "وصل حديثًا" }]} />
      <h1 className="text-3xl font-bold">وصل حديثًا</h1>
      <p className="mt-2 text-slate-600">اطلع على آخر الإضافات إلى مجموعتنا.</p>
      {products && products.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={p as Product} />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-md border p-6 text-center text-slate-500">لا توجد منتجات حالياً.</div>
      )}
    </div>
  )
}
