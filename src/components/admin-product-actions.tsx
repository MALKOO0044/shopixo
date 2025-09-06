"use client";

import Link from "next/link";
import ArchiveProductButton from "@/app/admin/products/archive-button";
import DeleteProductButton from "@/app/admin/products/delete-button";

export default function AdminProductActions({
  productId,
  productSlug,
  isActive = true,
}: {
  productId: number;
  productSlug: string;
  isActive?: boolean;
}) {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-md border bg-card/60 p-2 text-sm">
      <Link
        href={`/admin/products/${productId}/edit`}
        className="rounded-md bg-gradient-to-r from-primary/90 to-primary px-3 py-1.5 font-medium text-primary-foreground shadow hover:opacity-90"
      >
        تعديل
      </Link>
      <ArchiveProductButton productId={productId} isActive={isActive} />
      <DeleteProductButton productId={productId} doubleConfirm />
      <span className="ms-auto text-xs text-muted-foreground">لوحة تحكم المسؤول</span>
    </div>
  );
}
