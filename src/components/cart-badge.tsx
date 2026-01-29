import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { getCart } from "@/lib/cart-actions";

export default async function CartBadge() {
  const cart = await getCart();
  const totalQuantity = cart?.reduce((acc, item) => acc + item.quantity, 0) ?? 0;

  return (
    <Link
      href="/cart"
      className="relative flex items-center gap-2 text-sm font-medium hover:text-primary"
    >
      <ShoppingCart className="h-6 w-6" />
      {totalQuantity > 0 && (
        <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
          {totalQuantity}
        </span>
      )}
      <span className="sr-only">Shopping cart, {totalQuantity} items</span>
    </Link>
  );
}
