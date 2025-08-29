"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type CartItem = { id: string; title: string; price: number; image?: string; quantity: number };

type CartContextType = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clear: () => void;
  subtotal: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);
const KEY = "shopixo_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  const addItem = (item: Omit<CartItem, "quantity">, qty: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) return prev.map((p) => (p.id === item.id ? { ...p, quantity: p.quantity + qty } : p));
      return [...prev, { ...item, quantity: qty }];
    });
  };
  const removeItem = (id: string) => setItems((prev) => prev.filter((p) => p.id !== id));
  const updateQty = (id: string, qty: number) => setItems((prev) => prev.map((p) => (p.id === id ? { ...p, quantity: Math.max(1, qty) } : p)));
  const clear = () => setItems([]);

  const subtotal = useMemo(() => items.reduce((acc, i) => acc + i.price * i.quantity, 0), [items]);

  const value = useMemo(() => ({ items, addItem, removeItem, updateQty, clear, subtotal }), [items, subtotal]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
