import Link from "next/link";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-8 text-center text-sm text-muted-foreground">
        <div className="mb-6 flex justify-center gap-6">
          <Link href="/about" className="hover:text-primary">About Us</Link>
          <Link href="/contact" className="hover:text-primary">Contact</Link>
          <Link href="/privacy-policy" className="hover:text-primary">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
        </div>
        <div className="mb-6 flex justify-center gap-4">
          <a href="#" aria-label="Facebook" className="hover:text-primary"><Facebook size={20} /></a>
          <a href="#" aria-label="Instagram" className="hover:text-primary"><Instagram size={20} /></a>
          <a href="#" aria-label="Twitter" className="hover:text-primary"><Twitter size={20} /></a>
          <a href="#" aria-label="Youtube" className="hover:text-primary"><Youtube size={20} /></a>
        </div>
        <p>© {new Date().getFullYear()} Shopixo. All rights reserved.</p>
      </div>
    </footer>
  );
}
