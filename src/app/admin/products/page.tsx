import Image from "next/image";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import ArchiveProductButton from "@/app/admin/products/archive-button";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching products:", error);
    return <p className="text-red-500">Failed to load products.</p>;
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button asChild>
          <Link href="/admin/products/new">Add Product</Link>
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableCaption>A list of your products.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[100px] sm:table-cell">
                <span className="sr-only">Image</span>
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="hidden md:table-cell">Created at</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product: any) => (
              <TableRow key={product.id}>
                <TableCell className="hidden sm:table-cell">
                  <Image
                    alt={product.title}
                    className="aspect-square rounded-md object-cover"
                    height="64"
                    src={product.images?.[0] || "/placeholder.svg"}
                    width="64"
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {product.title}
                  {product.is_active === false && (
                    <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Archived</span>
                  )}
                </TableCell>
                <TableCell>{formatCurrency(product.price)}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {new Date(product.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right space-x-2 rtl:space-x-reverse">
                  <Link href={{ pathname: "/admin/products/[id]/edit", query: { id: String(product.id) } }} className="text-sm font-medium text-blue-600 hover:underline">
                    Edit
                  </Link>
                  <span className="mx-2 text-slate-300">|</span>
                  <ArchiveProductButton productId={product.id} isActive={product.is_active ?? true} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
