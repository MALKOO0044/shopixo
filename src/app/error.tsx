"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container py-20 text-center">
      <h1 className="text-4xl font-bold text-slate-900">Something went wrong</h1>
      <p className="mt-4 text-slate-600">
        An unexpected error occurred. Please try again or return to the homepage.
      </p>
      {error?.digest && (
        <p className="mt-2 text-xs text-slate-400">Error ID: {error.digest}</p>
      )}
      <div className="mt-8 flex items-center justify-center gap-4">
        <button
          onClick={reset}
          className="btn-primary"
          aria-label="Try again"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center font-medium text-slate-900 underline decoration-2 underline-offset-4"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
