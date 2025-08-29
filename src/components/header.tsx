"use client";
import Link from "next/link";
import { useState } from "react";
import Logo from "@/components/logo";

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" aria-label="Shopixo home" className="flex items-center gap-2">
            <Logo />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/" className="hover:text-brand">Home</Link>
            <Link href="/shop" className="hover:text-brand">Shop</Link>
            <Link href="/about" className="hover:text-brand">About</Link>
            <Link href="/contact" className="hover:text-brand">Contact</Link>
            <Link href="/faq" className="hover:text-brand">FAQ</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <form action="/search" className="hidden sm:block">
            <input
              name="q"
              placeholder="Search products..."
              className="w-56 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </form>
          <Link href="/cart" className="rounded-md px-3 py-2 text-sm font-medium hover:text-brand">Cart</Link>
          <Link href="/account" className="rounded-md px-3 py-2 text-sm font-medium hover:text-brand">Account</Link>
          <button className="md:hidden rounded-md px-3 py-2 text-sm font-medium" onClick={() => setOpen(!open)}>
            Menu
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t bg-white md:hidden">
          <nav className="container flex flex-col py-2 text-sm">
            <Link href="/" className="px-3 py-2">Home</Link>
            <Link href="/shop" className="px-3 py-2">Shop</Link>
            <Link href="/about" className="px-3 py-2">About</Link>
            <Link href="/contact" className="px-3 py-2">Contact</Link>
            <Link href="/faq" className="px-3 py-2">FAQ</Link>
          </nav>
        </div>
      )}
    </header>
  );
}
