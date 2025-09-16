import Link from "next/link";
import {
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  ShieldCheck,
  Apple,
  Play,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "Shopixo";

const socials = [
  { name: "Facebook", href: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK, Icon: Facebook },
  { name: "Instagram", href: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM, Icon: Instagram },
  { name: "Twitter", href: process.env.NEXT_PUBLIC_SOCIAL_TWITTER, Icon: Twitter },
  { name: "YouTube", href: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE, Icon: Youtube },
].filter((s) => !!s.href);

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200">
      {children}
    </span>
  );
}

export default function Footer() {
  return (
    <footer className="mt-12 border-t bg-[hsl(var(--secondary))] text-white">
      <div className="container py-10">
        {/* Top grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* About / Brand */}
          <div>
            <h3 className="mb-3 text-lg font-semibold">
              <span className="text-[hsl(var(--primary))]">{storeName}</span>
            </h3>
            <p className="mb-4 text-sm leading-6 text-white/80">
              متجر حديث يوفر منتجات مختارة بعناية وتجربة تسوق سهلة وآمنة.
            </p>
            <ul className="space-y-2 text-sm">
              <li><Link className="hover:text-[hsl(var(--primary))]" href="/about">من نحن</Link></li>
              <li><Link className="hover:text-[hsl(var(--primary))]" href="/contact">اتصل بنا</Link></li>
              <li><Link className="hover:text-[hsl(var(--primary))]" href="/blog">المدونة</Link></li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="mb-3 text-lg font-semibold text-white">المساعدة</h3>
            <ul className="space-y-2 text-sm">
              <li><Link className="hover:text-[hsl(var(--primary))]" href="/faq">الأسئلة الشائعة</Link></li>
              <li><Link className="hover:text-[hsl(var(--primary))]" href="/order-tracking">تتبع الطلب</Link></li>
              <li><Link className="hover:text-[hsl(var(--primary))]" href="/contact">مركز الدعم</Link></li>
              <li><Link className="hover:text-[hsl(var(--primary))]" href="/privacy-policy">سياسة الخصوصية</Link></li>
              <li><Link className="hover:text-[hsl(var(--primary))]" href="/terms">شروط الخدمة</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="mb-3 text-lg font-semibold text-white">خدمة العملاء</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Phone size={16} className="text-[hsl(var(--primary))]" /><span>دعم سريع عبر البريد</span></li>
              <li className="flex items-center gap-2"><Mail size={16} className="text-[hsl(var(--primary))]" /><a className="hover:text-[hsl(var(--primary))]" href="mailto:support@shopixo.com">support@shopixo.com</a></li>
              <li className="flex items-center gap-2"><MapPin size={16} className="text-[hsl(var(--primary))]" /><span>خدمة توصيل لمعظم المناطق</span></li>
            </ul>
          </div>

          {/* App Download (Coming soon) */}
          <div>
            <h3 className="mb-3 text-lg font-semibold text-white">تنزيل التطبيق</h3>
            <ul className="mb-4 space-y-1 text-sm text-slate-400">
              <li>• تتبع الطلبات في أي وقت</li>
              <li>• تنبيهات العروض والأسعار</li>
              <li>• عملية دفع أسرع</li>
            </ul>
            <div className="flex items-center gap-3">
              <a href="#" aria-label="App Store (قريباً)" className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-medium text-slate-900">
                <Apple size={16} />
                <span>App Store</span>
              </a>
              <a href="#" aria-label="Google Play (قريباً)" className="inline-flex items-center gap-2 rounded-md bg-black px-3 py-2 text-xs font-medium text-white">
                <Play size={16} />
                <span>Google Play</span>
              </a>
            </div>
            <p className="mt-2 text-[11px] text-white/70">قريبًا على متاجر التطبيقات</p>
          </div>
        </div>

        {/* Divider */}
        <div className="my-8 h-px w-full bg-white/15" />

        {/* Socials */}
        {socials.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center justify-center gap-4">
            {socials.map(({ name, href, Icon }) => (
              <a key={name} href={href as string} aria-label={name} target="_blank" rel="noopener noreferrer" className="text-white/80 transition hover:text-white">
                <Icon size={20} />
              </a>
            ))}
          </div>
        )}

        {/* Payments & Security */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
          <Badge>Apple&nbsp;Pay</Badge>
          <Badge>Google&nbsp;Pay</Badge>
          <Badge>Visa</Badge>
          <Badge>Mastercard</Badge>
          <Badge>American&nbsp;Express</Badge>
          <Badge>JCB</Badge>
          <Badge>Discover</Badge>
          <Badge>mada</Badge>
        </div>
        <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-[12px] text-white/80">
          <span className="inline-flex items-center gap-1"><ShieldCheck size={14} className="text-[hsl(var(--primary))]" /> SSL Secure</span>
          <span className="inline-flex items-center gap-1"><ShieldCheck size={14} className="text-[hsl(var(--primary))]" /> PCI DSS</span>
          <span className="inline-flex items-center gap-1"><ShieldCheck size={14} className="text-[hsl(var(--primary))]" /> 3D Secure</span>
        </div>

        {/* Lower links */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm">
          <Link href="/privacy-policy" className="text-white/80 hover:text-white">سياسة الخصوصية</Link>
          <Link href="/terms" className="text-white/80 hover:text-white">شروط الاستخدام</Link>
          <Link href="/contact" className="text-white/80 hover:text-white">الدعم</Link>
        </div>

        <p className="mt-4 text-center text-xs text-white/70">© {new Date().getFullYear()} {storeName}. جميع الحقوق محفوظة.</p>
      </div>
    </footer>
  );
}
