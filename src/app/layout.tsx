import "@/app/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Header from "@/components/header";
import Footer from "@/components/footer";
import CookieConsent from "@/components/cookie-consent";

const inter = Inter({ subsets: ["latin"] });
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Shopixo — Modern Online Store",
    template: "%s — Shopixo",
  },
  description: "Shopixo is a modern, professional online store.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.png", apple: "/favicon.png" },
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <CookieConsent />
      </body>
    </html>
  );
}
