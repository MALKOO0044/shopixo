export const metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">Checkout</h1>
      <p className="mt-2 text-slate-600">لإتمام الدفع الآمن، انتقل إلى السلة واضغط على زر متابعة الدفع.</p>
      <div className="mt-6">
        <a href="/cart" className="btn-primary inline-block">الانتقال إلى السلة</a>
        <p className="mt-3 text-sm text-slate-600">سيتم توجيهك تلقائيًا للدفع الآمن.</p>
      </div>
    </div>
  );
}
