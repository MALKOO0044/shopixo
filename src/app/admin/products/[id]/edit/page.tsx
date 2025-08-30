import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ProductForm from "@/app/admin/products/product-form";

export const metadata = {
  title: "Edit Product",
};

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!product) {
    redirect("/admin");
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">Edit Product</h1>
      <div className="mt-6 max-w-2xl">
        <ProductForm product={product} />
      </div>
    </div>
  );
}
