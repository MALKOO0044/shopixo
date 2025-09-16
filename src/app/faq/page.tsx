export const metadata = { title: "الأسئلة الشائعة" };

export default function FaqPage() {
  const faqs = [
    { q: "ما طرق الدفع المتاحة؟", a: "ندعم الدفع عبر Stripe وبطاقات الائتمان. سيتم تفعيل مزيد من الخيارات لاحقًا." },
    { q: "هل توفّرون إرجاع المنتجات؟", a: "نعم، إرجاع خلال 30 يومًا للمنتجات المؤهلة وفق سياسة الإرجاع." },
    { q: "كم يستغرق الشحن؟", a: "تُشحن معظم الطلبات خلال يومي عمل. مدة التوصيل تختلف حسب المدينة." },
  ];
  return (
    <div className="container max-w-3xl py-10" dir="rtl">
      <h1 className="text-3xl font-bold">الأسئلة الشائعة</h1>
      <div className="mt-6 space-y-6">
        {faqs.map((f) => (
          <div key={f.q} className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="font-semibold">{f.q}</div>
            <div className="mt-2 text-slate-700 text-sm">{f.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
