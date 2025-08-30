import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ProductForm from "@/app/admin/products/product-form";

export const metadata = {
  title: "Add New Product",
};

export default async function NewProductPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">Add New Product</h1>
      <div className="mt-6 max-w-2xl">
        <ProductForm />
      </div>
    </div>
  );
}
