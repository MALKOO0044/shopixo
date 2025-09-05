import Link from "next/link";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-8 text-center text-sm text-muted-foreground">
        <div className="mb-6 flex justify-center gap-6">
          <Link href="/about" className="hover:text-primary">من نحن</Link>
          <Link href="/contact" className="hover:text-primary">اتصل بنا</Link>
          <Link href="/privacy-policy" className="hover:text-primary">سياسة الخصوصية</Link>
          <Link href="/terms" className="hover:text-primary">شروط الخدمة</Link>
        </div>
        <div className="mb-6 flex justify-center gap-4">
          <a href="#" aria-label="Facebook" className="hover:text-primary"><Facebook size={20} /></a>
          <a href="#" aria-label="Instagram" className="hover:text-primary"><Instagram size={20} /></a>
          <a href="#" aria-label="Twitter" className="hover:text-primary"><Twitter size={20} /></a>
          <a href="#" aria-label="Youtube" className="hover:text-primary"><Youtube size={20} /></a>
        </div>
        <p>© {new Date().getFullYear()} شركة Shopixo. جميع الحقوق محفوظة.</p>
      </div>
    </footer>
  );
}
