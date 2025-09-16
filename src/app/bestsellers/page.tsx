import ProductCard from "@/components/product-card"
import Breadcrumbs from "@/components/breadcrumbs"
import { getSupabaseAnonServer } from "@/lib/supabase-server"
import type { Product } from "@/lib/types"

export const metadata = { title: "الأكثر مبيعًا", description: "المنتجات الأكثر مبيعًا في المتجر" }
export const revalidate = 60
export const dynamic = "force-dynamic"

export default async function BestsellersPage() {
  const supabase = getSupabaseAnonServer()
  let products: any[] | null = null
  if (!supabase) {
    products = []
  } else {
    // Prefer a sales_count column if present; else fallback to rating or price
    try {
      let { data, error } = await supabase.from("products").select("*").order("sales_count", { ascending: false })
      if (error && (error as any).code === "42703") {
        const byRating = await supabase.from("products").select("*").order("rating", { ascending: false })
        data = byRating.data as any
        error = byRating.error as any
        if (error && (error as any).code === "42703") {
          const byPrice = await supabase.from("products").select("*").order("price", { ascending: false })
          data = byPrice.data as any
        }
      }
      products = (data as any[] | null) ?? []
    } catch {
      products = []
    }
  }

  return (
    <div className="container py-10">
      <Breadcrumbs items={[{ name: "الرئيسية", href: "/" }, { name: "الأكثر مبيعًا" }]} />
      <h1 className="text-3xl font-bold">الأكثر مبيعًا</h1>
      <p className="mt-2 text-slate-600">منتجات يشتريها العملاء بكثرة.</p>
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
