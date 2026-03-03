export async function register() {
  // Only initialize Sentry if DSN is configured
  if (!process.env.SENTRY_DSN) return;
  
  try {
    const Sentry = await import('@sentry/nextjs');
    if (!Sentry || typeof Sentry.init !== 'function') return;
    
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.REPLIT_DEPLOYMENT ? 'production' : (process.env.VERCEL_ENV || process.env.NODE_ENV),
      enabled: true,
    });
  } catch {
    // Sentry not installed or initialization failed; continue without it
  }
}
