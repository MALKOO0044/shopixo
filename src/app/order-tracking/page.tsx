export const metadata = { title: "Order Tracking" };

export default function OrderTrackingPage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">Order Tracking</h1>
      <p className="mt-2 text-slate-600">Enter your order number to see the latest status.</p>
      <div className="mt-6 max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex gap-2">
          <input placeholder="Order #" className="w-full rounded-md border px-3 py-2" />
          <button className="btn-primary">Track</button>
        </div>
        <div className="mt-4 text-sm text-slate-600">Status: <span className="font-medium">Pending (demo)</span></div>
      </div>
    </div>
  );
}
