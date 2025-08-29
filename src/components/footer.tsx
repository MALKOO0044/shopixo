import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="container py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-base font-semibold">About Shopixo</h3>
            <p className="mt-3 text-slate-600 text-sm">
              A modern, professional store with secure checkout and fast delivery.
            </p>
          </div>
          <div>
            <h3 className="text-base font-semibold">Company</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link href="/about">About Us</Link></li>
              <li><Link href="/contact">Contact Us</Link></li>
              <li><Link href="/blog">Blog</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-base font-semibold">Support</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link href="/faq">FAQ</Link></li>
              <li><Link href="/privacy-policy">Privacy Policy</Link></li>
              <li><Link href="/return-policy">Return Policy</Link></li>
              <li><Link href="/terms">Terms of Service</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-base font-semibold">Newsletter</h3>
            <p className="mt-3 text-slate-600 text-sm">Subscribe for deals and new arrivals.</p>
            <form className="mt-4 flex gap-2">
              <input type="email" placeholder="Your email" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30" />
              <button className="btn-primary" type="button">Join</button>
            </form>
            <div className="mt-6 flex items-center gap-4 text-slate-600">
              <a href="#" aria-label="Facebook">Facebook</a>
              <a href="#" aria-label="Instagram">Instagram</a>
              <a href="#" aria-label="Twitter">Twitter</a>
              <a href="#" aria-label="TikTok">TikTok</a>
            </div>
          </div>
        </div>
        <div className="mt-10 text-sm text-slate-500">
          © {new Date().getFullYear()} Shopixo. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
