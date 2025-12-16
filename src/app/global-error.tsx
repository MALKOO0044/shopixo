"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    (async () => {
      try {
        const mod: any = await import("@sentry/nextjs");
        if (mod && typeof mod.captureException === "function") {
          mod.captureException(error);
        }
      } catch {}
    })();
  }, [error]);

  return (
    <html lang="en" dir="ltr">
      <body>
        <div className="container mx-auto max-w-2xl py-16">
          <h1 className="text-2xl font-bold text-red-600">An Unexpected Error Occurred</h1>
          <p className="mt-2 text-slate-600">We're working on fixing the issue. You can try again.</p>
          <div className="mt-6">
            <button
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
              onClick={() => reset()}
            >
              Try Again
            </button>
          </div>
          {process.env.NODE_ENV !== 'production' && (
            <pre className="mt-6 overflow-auto rounded bg-muted p-4 text-xs">{String(error?.stack || error?.message || "")}</pre>
          )}
        </div>
      </body>
    </html>
  );
}
