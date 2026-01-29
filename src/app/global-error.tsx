"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[GlobalError] Production error:", error?.message, error?.stack);
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
        <div style={{ maxWidth: '600px', margin: '80px auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#e31e24' }}>An Unexpected Error Occurred</h1>
          <p style={{ marginTop: '8px', color: '#666' }}>We're working on fixing the issue. You can try again.</p>
          <div style={{ marginTop: '24px' }}>
            <button
              style={{ 
                backgroundColor: '#e31e24', 
                color: 'white', 
                padding: '10px 20px', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontSize: '14px'
              }}
              onClick={() => reset()}
            >
              Try Again
            </button>
          </div>
          {error?.digest && (
            <p style={{ marginTop: '16px', fontSize: '12px', color: '#999' }}>Error ID: {error.digest}</p>
          )}
          <pre style={{ 
            marginTop: '24px', 
            padding: '16px', 
            backgroundColor: '#f5f5f5', 
            borderRadius: '8px', 
            fontSize: '12px', 
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {String(error?.message || "Unknown error")}
            {error?.stack && `\n\n${error.stack}`}
          </pre>
        </div>
      </body>
    </html>
  );
}
