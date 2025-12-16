"use client";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container py-20 text-center">
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Page Not Found</h1>
      <p className="mt-4 text-slate-600">
        Sorry, we couldn't find the page you're looking for.
      </p>
      <div className="mt-8 flex items-center justify-center gap-4">
        <Link href="/" className="inline-flex items-center rounded bg-black text-white px-4 py-2 text-sm hover:bg-gray-800">Back to Home</Link>
        <Link
          href="/shop"
          className="inline-flex items-center font-medium text-slate-900 underline decoration-2 underline-offset-4"
        >
          Browse Products
        </Link>
      </div>
    </div>
  );
}
