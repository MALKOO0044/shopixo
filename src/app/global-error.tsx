"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    try {
      Sentry.captureException(error);
    } catch {}
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body>
        <div className="container mx-auto max-w-2xl py-16">
          <h1 className="text-2xl font-bold text-red-600">حدث خطأ غير متوقع</h1>
          <p className="mt-2 text-slate-600">نحن نعمل على إصلاح المشكلة. يمكنك المحاولة مرة أخرى.</p>
          <div className="mt-6">
            <button
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
              onClick={() => reset()}
            >
              إعادة المحاولة
            </button>
          </div>
          {process.env.NODE_ENV !== 'production' && (
            <pre className="mt-6 overflow-auto rounded bg-muted p-4 text-xs" dir="ltr">{String(error?.stack || error?.message || "")}</pre>
          )}
        </div>
      </body>
    </html>
  );
}
