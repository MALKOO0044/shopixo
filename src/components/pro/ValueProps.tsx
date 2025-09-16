import { ShieldCheck, Truck, RotateCcw, Headphones } from "lucide-react"

export default function ValueProps() {
  const items = [
    { Icon: Truck, title: "شحن سريع", desc: "توصيل موثوق لمعظم المناطق" },
    { Icon: RotateCcw, title: "إرجاع خلال 30 يومًا", desc: "استرجاع سهل وبدون تعقيد" },
    { Icon: ShieldCheck, title: "دفع آمن", desc: "حماية SSL ومعايير PCI" },
    { Icon: Headphones, title: "دعم مميز", desc: "فريق خدمة عملاء جاهز للمساعدة" }
  ]
  return (
    <section className="bg-[hsl(var(--bg-secondary))] py-8" aria-label="مزايا المتجر">
      <div className="container grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ Icon, title, desc }) => (
          <div key={title} className="rounded-[var(--radius-lg)] border bg-card p-5 shadow-soft">
            <div className="mb-2 flex items-center gap-2 text-[hsl(var(--secondary))]">
              <Icon className="h-6 w-6" />
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
