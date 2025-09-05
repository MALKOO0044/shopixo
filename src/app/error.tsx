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
    <div dir="rtl" className="container py-20 text-center">
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">حدث خطأ غير متوقع</h1>
      <p className="mt-4 text-slate-600">
        عذرًا، حدث خطأ. يرجى المحاولة مرة أخرى أو العودة إلى الصفحة الرئيسية.
      </p>
      {error?.digest && (
        <p className="mt-2 text-xs text-slate-400">معرّف الخطأ: {error.digest}</p>
      )}
      <div className="mt-8 flex items-center justify-center gap-4">
        <button
          onClick={reset}
          className="inline-flex items-center rounded bg-black text-white px-4 py-2 text-sm hover:bg-gray-800"
          aria-label="حاول مرة أخرى"
        >
          حاول مرة أخرى
        </button>
        <Link
          href="/"
          className="inline-flex items-center font-medium text-slate-900 underline decoration-2 underline-offset-4"
        >
          العودة إلى الرئيسية
        </Link>
      </div>
    </div>
  );
}
