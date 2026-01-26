"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from "react";

interface CartCountContextType {
  count: number;
  refresh: () => Promise<void>;
  setCount: (count: number) => void;
}

const CartCountContext = createContext<CartCountContextType>({
  count: 0,
  refresh: async () => {},
  setCount: () => {},
});

const CART_CHANNEL_NAME = "shopixo-cart-count";

export function useCartCount() {
  return useContext(CartCountContext);
}

export function CartCountProvider({ children }: { children: ReactNode }) {
  const [count, setCountState] = useState(0);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/cart/count", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const newCount = data.count || 0;
        setCountState(newCount);
        channelRef.current?.postMessage({ type: "count", count: newCount });
      }
    } catch {
    }
  }, []);

  const setCount = useCallback((newCount: number) => {
    const safeCount = Math.max(0, newCount);
    setCountState(safeCount);
    channelRef.current?.postMessage({ type: "count", count: safeCount });
  }, []);

  useEffect(() => {
    if (typeof BroadcastChannel !== "undefined") {
      channelRef.current = new BroadcastChannel(CART_CHANNEL_NAME);
      channelRef.current.onmessage = (event) => {
        if (event.data?.type === "count" && typeof event.data.count === "number") {
          setCountState(event.data.count);
        }
      };
    }
    return () => {
      channelRef.current?.close();
    };
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [refresh]);

  return (
    <CartCountContext.Provider value={{ count, refresh, setCount }}>
      {children}
    </CartCountContext.Provider>
  );
}
