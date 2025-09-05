export const metadata = { title: "من نحن" };

export default function AboutPage() {
  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold">من نحن</h1>
      <div className="mt-4 space-y-4 text-slate-700">
        <p>
          شوبكسو هو متجر إلكتروني حديث يركّز على جودة المنتجات، ودفعات آمنة، وتجربة تسوق ممتعة باللغة العربية وبدعم كامل للاتجاه من اليمين إلى اليسار.
        </p>
        <p>
          هدفنا تقديم رحلة تسوق احترافية وسريعة ومريحة، مع سياسات واضحة ودعم مميّز لعملائنا في المنطقة.
        </p>
      </div>
    </div>
  );
}
