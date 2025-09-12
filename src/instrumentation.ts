export async function register() {
  if (!process.env.SENTRY_DSN) return;
  try {
    const Sentry: any = await import('@sentry/nextjs');
    if (!Sentry || typeof Sentry.init !== 'function') return;
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
      enabled: true,
    });
  } catch {
    // Sentry not installed; skip initialization
  }
}
