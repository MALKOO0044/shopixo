import "@/app/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import LitbHeader from "@/components/litb/LitbHeader";
import LitbNavBar from "@/components/litb/LitbNavBar";
import LitbFooter from "@/components/litb/LitbFooter";
import FixedSidebar from "@/components/litb/FixedSidebar";
import CookieConsent from "@/components/cookie-consent";
import { ThemeProvider } from "@/components/theme-provider";
import { Suspense } from "react";
import { ToastProvider } from "@/components/ui/toast-provider";
import { getSiteUrl } from "@/lib/site";
import Script from "next/script";
import { headers } from "next/headers";
<<<<<<< HEAD
import DisableDragScroll from "@/components/disable-drag-scroll";
import { CartCountProvider } from "@/components/cart/CartCountProvider";
=======
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
const siteUrl = (() => {
  try {
    return new URL(rawSiteUrl).toString();
  } catch {
    return "http://localhost:3000";
  }
})();

const brandLogo = "/logo-header.svg";
const absoluteBrandLogo = `${getSiteUrl()}${brandLogo}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
<<<<<<< HEAD
    default: "Shopixo - Global Online Shopping",
    template: "%s | Shopixo",
=======
    default: "LightInTheBox - Global Online Shopping",
    template: "%s | LightInTheBox",
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
  },
  description: "Shop quality products at amazing prices. Free worldwide shipping on orders over $50.",
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
<<<<<<< HEAD
    siteName: "Shopixo",
    title: "Shopixo - Global Online Shopping",
=======
    siteName: "LightInTheBox",
    title: "LightInTheBox - Global Online Shopping",
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
    description: "Shop quality products at amazing prices. Free worldwide shipping on orders over $50.",
    images: [brandLogo],
  },
  twitter: {
    card: "summary_large_image",
<<<<<<< HEAD
    title: "Shopixo - Global Online Shopping",
=======
    title: "LightInTheBox - Global Online Shopping",
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
    description: "Shop quality products at amazing prices. Free worldwide shipping on orders over $50.",
    images: [brandLogo],
  },
};

export const viewport = {
  themeColor: "#e31e24",
};

export const runtime = "nodejs";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = headers().get('x-csp-nonce') || undefined;
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className={`${inter.variable} ${inter.className} min-h-screen flex flex-col bg-gray-50`}>
        {(() => {
          try {
            const analyticsDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || new URL(getSiteUrl()).hostname;
            if (!analyticsDomain) return null;
            return (
              <Script
                src="https://plausible.io/js/script.js"
                strategy="afterInteractive"
                data-domain={analyticsDomain as any}
                nonce={nonce as any}
              />
            );
          } catch {
            return null;
          }
        })()}
        <ThemeProvider>
<<<<<<< HEAD
          <DisableDragScroll />
=======
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
          <ToastProvider>
            <a href="#main-content" className="skip-link">Skip to content</a>
            <script
              nonce={nonce}
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "Organization",
<<<<<<< HEAD
                  name: "Shopixo",
=======
                  name: "LightInTheBox",
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
                  url: getSiteUrl(),
                  logo: absoluteBrandLogo,
                }),
              }}
            />
            <script
              nonce={nonce}
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "WebSite",
<<<<<<< HEAD
                  name: "Shopixo",
=======
                  name: "LightInTheBox",
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
                  url: getSiteUrl(),
                  potentialAction: {
                    "@type": "SearchAction",
                    target: `${getSiteUrl()}/search?q={search_term_string}`,
                    "query-input": "required name=search_term_string",
                  },
                }),
              }}
            />
<<<<<<< HEAD
            <CartCountProvider>
              <Suspense fallback={null}>
                <LitbHeader />
              </Suspense>
              <Suspense fallback={null}>
                <LitbNavBar />
              </Suspense>
              <Suspense fallback={null}>
                <main id="main-content" className="flex-1">{children}</main>
              </Suspense>
              <Suspense fallback={null}>
                <FixedSidebar />
              </Suspense>
              <Suspense fallback={null}>
                <LitbFooter />
              </Suspense>
              <CookieConsent />
            </CartCountProvider>
=======
            <Suspense fallback={null}>
              <LitbHeader />
            </Suspense>
            <Suspense fallback={null}>
              <LitbNavBar />
            </Suspense>
            <Suspense fallback={null}>
              <main id="main-content" className="flex-1">{children}</main>
            </Suspense>
            <Suspense fallback={null}>
              <FixedSidebar />
            </Suspense>
            <Suspense fallback={null}>
              <LitbFooter />
            </Suspense>
            <CookieConsent />
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
