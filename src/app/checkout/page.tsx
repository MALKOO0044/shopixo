export const metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">Checkout</h1>
      <p className="mt-2 text-slate-600">To complete your secure payment, go to your cart and click the checkout button.</p>
      <div className="mt-6">
        <a href="/cart" className="btn-primary inline-block">Go to Cart</a>
        <p className="mt-3 text-sm text-slate-600">You will be redirected to secure payment.</p>
      </div>
    </div>
  );
}
