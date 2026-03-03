// Client-side Sentry initialization with optional dynamic import.
// If the package is not installed, we skip initialization gracefully.
if (process.env.SENTRY_DSN) {
  (async () => {
    try {
      const mod: any = await import('@sentry/nextjs');
      if (!mod || typeof mod.init !== 'function') return;
      mod.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: 0.1,
        enabled: true,
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
      });
    } catch {
      // Sentry not installed; skip
    }
  })();
}
