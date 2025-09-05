export const metadata = { title: "Blog" };

export default function BlogPage() {
  const posts = [
    {
      title: "إطلاق Shopixo",
      date: "2025-09-01",
      excerpt: "يسرّنا الإعلان عن إطلاق المتجر بواجهة حديثة وتجربة شراء سلسة.",
    },
    {
      title: "تحديث: الدفع الآمن",
      date: "2025-09-03",
      excerpt: "تم تمكين الدفع الآمن عبر المزود المعتمد مع تتبّع الطلبات للمستخدمين.",
    },
    {
      title: "نصائح للتسوّق الذكي",
      date: "2025-09-05",
      excerpt: "خمس نصائح للاستفادة من القسائم والعروض وتخفيض تكاليف الشحن.",
    },
  ];

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">المدونة</h1>
      <p className="mt-2 text-slate-600">آخر الأخبار والتحديثات من فريق Shopixo.</p>
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((p, idx) => (
          <article key={idx} className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="text-xs text-slate-500">{new Date(p.date).toLocaleDateString()}</div>
            <h2 className="mt-2 text-lg font-semibold">{p.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{p.excerpt}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
