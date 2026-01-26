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
  output: 'standalone',
  experimental: {
    // Disable Turbopack for compatibility
    optimizePackageImports: ["@radix-ui/react-dropdown-menu", "@radix-ui/react-label", "@radix-ui/react-radio-group", "@radix-ui/react-select", "@radix-ui/react-slot"]
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lwqddoivcbqnadamczhl.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3cWRkb2l2Y2JxbmFkYW1jemhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2ODEyMjYsImV4cCI6MjA3MjI1NzIyNn0.T5Z5iv4F8P0pfWDesjnpC6WXIKMDCX3lbVv2Ff4dFFE',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://shopixo.net',
    NEXT_PUBLIC_STORE_NAME: process.env.NEXT_PUBLIC_STORE_NAME || 'Shopixo',
    NEXT_PUBLIC_BRAND_LOGO_URL: process.env.NEXT_PUBLIC_BRAND_LOGO_URL || 'https://res.cloudinary.com/diznlpbew/image/upload/v1757598221/ChatGPT_Image_Sep_11_2025_04_40_35_PM_tm7frr.png',
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'diznlpbew',
    NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'shopixo_signed',
    NEXT_PUBLIC_SOCIAL_INSTAGRAM: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM || 'https://www.instagram.com/shoplxo?igsh=bzZ1MTkyaDJmZjBi',
  },
  allowedDevOrigins: ['*.replit.dev', '*.kirk.replit.dev', '127.0.0.1', 'localhost'],
  // Increase SSG timeout for heavy concurrent renders in CI
  staticPageGenerationTimeout: 180,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/**' },
      { protocol: 'https', hostname: '**.supabase.in', pathname: '/**' },
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      // CJ & common CN CDNs (product media)
      { protocol: 'https', hostname: '**.cjdropshipping.com', pathname: '/**' },
      { protocol: 'https', hostname: 'cjdropshipping.com', pathname: '/**' },
      { protocol: 'https', hostname: '**.alicdn.com', pathname: '/**' },
      { protocol: 'https', hostname: '**.aliyuncs.com', pathname: '/**' },
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
