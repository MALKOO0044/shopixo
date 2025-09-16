import "@/app/globals.css";
import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import Header from "@/components/header";
import AnnouncementBar from "@/components/announcement-bar";
import NavigationBar from "@/components/navigation-bar";
import CategoriesBar from "@/components/categories-bar";
import Footer from "@/components/footer";
import CookieConsent from "@/components/cookie-consent";
import { ThemeProvider } from "@/components/theme-provider";
import { Suspense } from "react";
import { ToastProvider } from "@/components/ui/toast-provider";
import { getSiteUrl } from "@/lib/site";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400","600","700"], variable: "--font-playfair" });
const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
const siteUrl = (() => {
  try {
    // Ensure an absolute, valid URL string (includes protocol)
    return new URL(rawSiteUrl).toString();
  } catch {
    return "http://localhost:3000";
  }
})();

// Use the composite header logo (star + wordmark) as brand image in meta
const brandLogo = "/logo-header.svg";
const absoluteBrandLogo = `${getSiteUrl()}${brandLogo}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Shopixo — Modern Online Store",
    template: "%s — Shopixo",
  },
  description: "Shopixo is a modern, professional online store.",
  // Use dedicated icons in public/ for favicon + apple
  icons: {
    icon: [
      "/favicon.ico",
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Shopixo",
    title: "Shopixo — Modern Online Store",
    description: "Shopixo is a modern, professional online store.",
    images: [brandLogo],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shopixo — Modern Online Store",
    description: "Shopixo is a modern, professional online store.",
    images: [brandLogo],
  },
};

export const viewport = {
  themeColor: "#0b2c4f",
};

export const runtime = "nodejs";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} ${inter.className} min-h-screen flex flex-col`}>
        {/* Analytics: Plausible (loads only in production if domain is set) */}
        {(() => {
          try {
            const analyticsDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || new URL(getSiteUrl()).hostname;
            if (!analyticsDomain) return null;
            return (
              <Script
                src="https://plausible.io/js/script.js"
                strategy="afterInteractive"
                data-domain={analyticsDomain as any}
              />
            );
          } catch {
            return null;
          }
        })()}
        <ThemeProvider>
          <ToastProvider>
            {/* Skip to content for accessibility */}
            <a href="#main-content" className="skip-link">تخطي إلى المحتوى</a>
            {/* Announcement Bar */}
            <AnnouncementBar />
            {/* Site-wide Structured Data: Organization + WebSite with SearchAction */}
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "Organization",
                  name: process.env.NEXT_PUBLIC_STORE_NAME || "Shopixo",
                  url: getSiteUrl(),
                  logo: absoluteBrandLogo,
                  sameAs: [
                    process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK,
                    process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM,
                    process.env.NEXT_PUBLIC_SOCIAL_TWITTER,
                    process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE,
                  ].filter(Boolean),
                }),
              }}
            />
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "WebSite",
                  name: process.env.NEXT_PUBLIC_STORE_NAME || "Shopixo",
                  url: getSiteUrl(),
                  potentialAction: {
                    "@type": "SearchAction",
                    target: `${getSiteUrl()}/search?q={search_term_string}`,
                    "query-input": "required name=search_term_string",
                  },
                }),
              }}
            />
            <Suspense fallback={null}>
              <Header />
            </Suspense>
            <Suspense fallback={null}>
              <NavigationBar />
            </Suspense>
            <Suspense fallback={null}>
              <CategoriesBar />
            </Suspense>
            <Suspense fallback={null}>
              <main id="main-content" className="flex-1">{children}</main>
            </Suspense>
            <Suspense fallback={null}>
              <Footer />
            </Suspense>
            <CookieConsent />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
