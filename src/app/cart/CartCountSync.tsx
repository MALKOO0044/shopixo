"use client";

import { useCartCount } from "@/components/cart/CartCountProvider";
import { useEffect } from "react";

export default function CartCountSync({ serverCount }: { serverCount: number }) {
  const { setCount } = useCartCount();

  useEffect(() => {
    setCount(serverCount);
  }, [serverCount, setCount]);

  return null;
}
