"use client";

import Link from "next/link";
import { useState } from "react";

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        className="rounded-md px-3 py-2 text-sm font-medium"
        onClick={() => setOpen(!open)}
      >
        Menu
      </button>
      {open && (
        <div className="absolute left-0 top-full w-full border-t bg-white">
          <nav className="container flex flex-col py-2 text-sm">
            <Link href="/" className="px-3 py-2" onClick={() => setOpen(false)}>
              Home
            </Link>
            <Link href="/shop" className="px-3 py-2" onClick={() => setOpen(false)}>
              Shop
            </Link>
            <Link href="/about" className="px-3 py-2" onClick={() => setOpen(false)}>
              About
            </Link>
            <Link href="/contact" className="px-3 py-2" onClick={() => setOpen(false)}>
              Contact
            </Link>
            <Link href="/faq" className="px-3 py-2" onClick={() => setOpen(false)}>
              FAQ
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
