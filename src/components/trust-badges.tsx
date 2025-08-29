export default function TrustBadges() {
  const items = [
    { icon: "🔒", label: "Secure Checkout" },
    { icon: "↩️", label: "30-day Returns" },
    { icon: "⚡", label: "Fast Delivery" },
    { icon: "⭐", label: "Top Reviews" },
  ];
  return (
    <div className="container">
      <div className="grid grid-cols-2 gap-4 py-6 text-sm text-slate-700 sm:grid-cols-4">
        {items.map((i) => (
          <div key={i.label} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 shadow-sm">
            <span className="text-lg" aria-hidden>{i.icon}</span>
            <span>{i.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
