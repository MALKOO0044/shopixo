import Image from "next/image"
import Link from "next/link"

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[hsl(var(--bg))]" aria-label="قسم البطل">
      <div className="container grid gap-6 py-12 md:grid-cols-2 md:py-16 lg:py-20">
        <div className="flex flex-col items-start justify-center text-right md:order-2" dir="rtl">
          <h1 className="mb-3 text-2xl sm:text-4xl lg:text-5xl font-bold" style={{ fontFamily: 'var(--font-playfair), Playfair Display, serif' }}>
            تجربة تسوّق فاخرة مع تشكيلة مختارة بعناية
          </h1>
          <p className="mb-6 max-w-prose text-muted-foreground text-sm sm:text-base">
            منتجات بجودة عالية وشحن سريع ودفع آمن. اكتشف أحدث المجموعات والعروض اليوم.
          </p>
          <div className="flex w-full flex-wrap items-center gap-3" dir="rtl">
            <Link href="/shop" className="inline-flex w-full sm:w-auto items-center justify-center rounded-[var(--radius-btn)] bg-[hsl(var(--primary))] px-6 py-3 text-white shadow-soft transition hover:brightness-95 text-base">
              تسوّق الآن
            </Link>
            <Link href="/collections" className="inline-flex w-full sm:w-auto items-center justify-center rounded-[var(--radius-btn)] border-2 border-[hsl(var(--secondary))] px-5 py-2.5 text-[hsl(var(--secondary))] transition hover:bg-[hsl(var(--secondary))]/10 text-base">
              المجموعات
            </Link>
          </div>
        </div>
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-image md:order-1">
          <Image
            src="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=1600&auto=format&fit=crop"
            alt="صورة فاخرة لمنتجات"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        </div>
      </div>
    </section>
  )
}
