import "@/app/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Header from "@/components/header";
import AnnouncementBar from "@/components/announcement-bar";
import NavigationBar from "@/components/navigation-bar";
import Footer from "@/components/footer";
import CookieConsent from "@/components/cookie-consent";
import { ThemeProvider } from "@/components/theme-provider";
import { Suspense } from "react";
import { ToastProvider } from "@/components/ui/toast-provider";
import { getSiteUrl } from "@/lib/site";

const inter = Inter({ subsets: ["latin"] });
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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Shopixo — Modern Online Store",
    template: "%s — Shopixo",
  },
  description: "Shopixo is a modern, professional online store.",
  icons: { icon: "/favicon.svg", apple: "/favicon.svg" },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Shopixo",
    title: "Shopixo — Modern Online Store",
    description: "Shopixo is a modern, professional online store.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shopixo — Modern Online Store",
    description: "Shopixo is a modern, professional online store.",
  },
};

export const runtime = "nodejs";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen flex flex-col`}>
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
                  logo: `${getSiteUrl()}/favicon.svg`,
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
