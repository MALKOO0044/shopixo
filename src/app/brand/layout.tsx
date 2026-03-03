import "@/app/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brand Review — Shopixo",
  description: "Internal brand preview for Shopixo (logos, colors, packaging).",
};

export default function BrandLayout({ children }: { children: React.ReactNode }) {
  return (
    <section id="brand-preview" className="min-h-screen">
      {children}
    </section>
  );
}
