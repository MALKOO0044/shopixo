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
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">An Unexpected Error Occurred</h1>
      <p className="mt-4 text-slate-600">
        Sorry, something went wrong. Please try again or return to the home page.
      </p>
      {error?.digest && (
        <p className="mt-2 text-xs text-slate-400">Error ID: {error.digest}</p>
      )}
      <div className="mt-8 flex items-center justify-center gap-4">
        <button
          onClick={reset}
          className="inline-flex items-center rounded bg-black text-white px-4 py-2 text-sm hover:bg-gray-800"
          aria-label="Try again"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="inline-flex items-center font-medium text-slate-900 underline decoration-2 underline-offset-4"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
