export const metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">Checkout</h1>
      <p className="mt-2 text-slate-600">Stripe & PayPal secure checkout integration is coming next. For now, this is a placeholder step.</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Shipping Details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <input placeholder="Full name" className="rounded-md border px-3 py-2" />
            <input placeholder="Email" className="rounded-md border px-3 py-2" />
            <input placeholder="Address" className="rounded-md border px-3 py-2 sm:col-span-2" />
            <input placeholder="City" className="rounded-md border px-3 py-2" />
            <input placeholder="Postal code" className="rounded-md border px-3 py-2" />
            <input placeholder="Country" className="rounded-md border px-3 py-2" />
          </div>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Payment</h2>
          <p className="mt-2 text-sm text-slate-600">Secure payment with Stripe & PayPal will appear here.</p>
          <button className="btn-primary mt-4 w-full" disabled>Pay now (disabled)</button>
        </div>
      </div>
    </div>
  );
}
