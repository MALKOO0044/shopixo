import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container py-20 text-center">
      <h1 className="text-4xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-4 text-slate-600">
        Sorry, we couldn’t find the page you’re looking for.
      </p>
      <div className="mt-8 flex items-center justify-center gap-4">
        <Link href="/" className="btn-primary">Go home</Link>
        <Link
          href="/shop"
          className="inline-flex items-center font-medium text-slate-900 underline decoration-2 underline-offset-4"
        >
          Browse products
        </Link>
      </div>
    </div>
  );
}
