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
import DeleteProductButton from "@/app/admin/products/delete-button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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

  function pickPrimaryImage(images: any): string | null {
    try {
      if (!images) return null;
      if (Array.isArray(images)) {
        const v = images.find((s: any) => typeof s === 'string' && s.trim().length > 0) as string | undefined;
        return v || null;
      }
      if (typeof images === 'string') {
        const s = images.trim();
        if (!s) return null;
        if (s.startsWith('[') && s.endsWith(']')) {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) {
            const v = parsed.find((x: any) => typeof x === 'string' && x.trim().length > 0);
            return (v as string) || null;
          }
        }
        if (s.includes(',')) {
          const v = s.split(',').map((x) => x.trim()).find((x) => x.length > 0);
          return v || null;
        }
        return s; // single URL string
      }
    } catch {}
    return null;
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
              <TableHead className="w-[80px]">
                Image
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="hidden md:table-cell">Created at</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product: any) => (
              <TableRow key={product.id}>
                <TableCell>
                  <Image
                    alt={product.title}
                    className="aspect-square rounded-md object-cover"
                    height="64"
                    src={pickPrimaryImage(product.images) || "/placeholder.svg"}
                    width="64"
                    unoptimized
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {product.title}
                  {product.is_active === false && (
                    <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Archived</span>
                  )}
                </TableCell>
                <TableCell>{formatCurrency(product.price)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{typeof product.stock === 'number' ? product.stock : 0}</span>
                    <span className={
                      (product.stock ?? 0) > 0
                        ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
                        : "rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700"
                    }>
                      {(product.stock ?? 0) > 0 ? 'Available' : 'Out of Stock'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {new Date(product.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  {/* Hidden forms to be triggered from the dropdown */}
                  <div className="sr-only">
                    <ArchiveProductButton formId={`archive-form-${product.id}`} productId={product.id} isActive={product.is_active ?? true} />
                    <DeleteProductButton formId={`delete-form-${product.id}`} productId={product.id} doubleConfirm />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">إجراءات</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/products/${product.id}/edit`} className="cursor-pointer">
                          تعديل
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <button type="submit" form={`archive-form-${product.id}`} className="w-full text-right">
                          {product.is_active === false ? 'استعادة' : 'أرشفة'}
                        </button>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <button type="submit" form={`delete-form-${product.id}`} className="w-full text-right text-red-600">
                          حذف
                        </button>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
