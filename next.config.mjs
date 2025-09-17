// Make Sentry optional at build time. If the package is not present,
// we fall back to a no-op wrapper to avoid breaking builds.
let withSentryConfig = (cfg) => cfg;
try {
  const mod = await import('@sentry/nextjs');
  if (mod && typeof mod.withSentryConfig === 'function') {
    withSentryConfig = mod.withSentryConfig;
  }
} catch (_) {
  // No-op: Sentry not installed; continue without it.
}
// CSP is set via middleware with a per-request nonce. Keep other headers here.
const securityHeaders = [
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Additional hardening
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: true },
  // Increase SSG timeout for heavy concurrent renders in CI
  staticPageGenerationTimeout: 180,
  eslint: {
    // Do not fail the production build if ESLint errors are present
    // We'll surface them in CI/local and treat them as warnings during deploys
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/**' },
      { protocol: 'https', hostname: '**.supabase.in', pathname: '/**' },
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
    ],
  },
  async headers() {
    return [
      {
        // Apply these headers to all routes in your application.
        source: '/:path*',
        headers: securityHeaders,
      },
      // Force immediate freshness for icons/manifest so updates reflect right away
      {
        source: '/manifest.webmanifest',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=0, must-revalidate' },
        ],
      },
      {
        source: '/favicon.ico',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=0, must-revalidate' },
        ],
      },
      {
        source: '/favicon-:size(16x16|32x32|48x48).png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=0, must-revalidate' },
        ],
      },
      {
        source: '/apple-touch-icon.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=0, must-revalidate' },
        ],
      },
      {
        source: '/android-chrome-:size(192x192|256x256|384x384|512x512).png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=0, must-revalidate' },
        ],
      },
      {
        source: '/maskable-icon-512.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=0, must-revalidate' },
        ],
      },
      {
        source: '/favicon.svg',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=0, must-revalidate' },
        ],
      },
      {
        source: '/logo-icon.svg',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=0, must-revalidate' },
        ],
      },
      {
        source: '/logo-wordmark.svg',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=0, must-revalidate' },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  // Avoid requiring org/project/token; runtime Sentry will still work via SENTRY_DSN
  disableClientWebpackPlugin: true,
  disableServerWebpackPlugin: true,
}, {
  // Keep source maps hidden even if later enabled
  hideSourceMaps: true,
});
