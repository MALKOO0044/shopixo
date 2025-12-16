export const metadata = { title: "FAQ" };

export default function FaqPage() {
  const faqs = [
    { q: "What payment methods are available?", a: "We support payment via Stripe and credit cards. More options will be enabled soon." },
    { q: "Do you offer returns?", a: "Yes, 30-day returns for eligible products according to our return policy." },
    { q: "How long does shipping take?", a: "Most orders ship within 2 business days. Delivery time varies by location." },
  ];
  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold">Frequently Asked Questions</h1>
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
