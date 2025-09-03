import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import DeleteProductButton from "./products/delete-button";

export const metadata = {
  title: "Admin Dashboard",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Later, we can add role-based access control here

  const { data: products, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching products:", error.message);
    return (
      <div className="container py-10 text-center">
        <h2 className="text-xl font-semibold text-red-600">Failed to load products</h2>
        <p className="mt-2 text-slate-500">There was an issue connecting to the database. Please try again later.</p>
        <p className="mt-4 text-xs text-slate-400">Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Products</h1>
        <Link href="/admin/products/new" className="btn-primary">
          Add Product
        </Link>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-slate-100 text-left text-sm font-medium text-slate-600">
              <th className="p-3">Image</th>
              <th className="p-3">Name</th>
              <th className="p-3">Price</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products && products.length > 0 ? (
              products.map((product) => (
                <tr key={product.id} className="border-b">
                  <td className="p-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-md bg-slate-100">
                      <Image src={product.images?.[0] || "/placeholder.svg"} alt={product.title} fill className="object-cover" />
                    </div>
                  </td>
                  <td className="p-3 font-medium">{product.title}</td>
                  <td className="p-3">{formatCurrency(product.price)}</td>
                  <td className="p-3">
                    <Link
                      href={{ pathname: `/admin/products/${product.id}/edit` }}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      Edit
                    </Link>
                    <span className="mx-2 text-slate-300">|</span>
                    <DeleteProductButton productId={product.id} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-500">
                  No products found. Add your first product to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
