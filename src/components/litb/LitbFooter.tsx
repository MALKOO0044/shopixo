import Link from "next/link";
import { Facebook, Instagram, Twitter, Youtube, Mail, Phone } from "lucide-react";
import type { Route } from "next";

const FOOTER_LINKS = {
  "Customer Service": [
    { label: "Contact Us", href: "/contact" },
    { label: "FAQ", href: "/faq" },
    { label: "Track Order", href: "/order-tracking" },
    { label: "Shipping Info", href: "/shipping" },
    { label: "Returns & Refunds", href: "/returns" },
  ],
  "About Us": [
    { label: "About Shopixo", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Press", href: "/press" },
    { label: "Blog", href: "/blog" },
  ],
  "Payment & Security": [
    { label: "Payment Methods", href: "/payment" },
    { label: "Security Center", href: "/security" },
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms of Use", href: "/terms" },
  ],
};

export default function LitbFooter() {
  return (
    <footer className="bg-gray-800 text-white mt-8">
      <div className="max-w-[1320px] mx-auto px-2 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4">
              <span className="text-white">Shop</span>
              <span className="text-[#e31e24]">ixo</span>
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Your one-stop shop for quality products at amazing prices. Free shipping worldwide on orders over $50.
            </p>
            <div className="flex gap-3">
              <a href="#" className="text-gray-400 hover:text-white"><Facebook className="h-5 w-5" /></a>
              <a href="#" className="text-gray-400 hover:text-white"><Instagram className="h-5 w-5" /></a>
              <a href="#" className="text-gray-400 hover:text-white"><Twitter className="h-5 w-5" /></a>
              <a href="#" className="text-gray-400 hover:text-white"><Youtube className="h-5 w-5" /></a>
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold mb-4">{title}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href as Route} className="text-sm text-gray-400 hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-700 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> support@shopixo.com</span>
              <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> 1-800-XXX-XXXX</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Visa</span>
              <span>Mastercard</span>
              <span>PayPal</span>
            </div>
          </div>
          <p className="text-center text-xs text-gray-500 mt-4">
            © 2024 Shopixo. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
