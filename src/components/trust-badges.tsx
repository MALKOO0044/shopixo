export default function TrustBadges() {
  const items = [
    { icon: "🔒", label: "Secure Payment" },
    { icon: "↩️", label: "30-Day Returns" },
    { icon: "⚡", label: "Fast Shipping" },
    { icon: "⭐", label: "Excellent Reviews" },
  ];
  return (
    <div className="container">
      <div className="grid grid-cols-2 gap-4 py-6 text-sm text-foreground sm:grid-cols-4">
        {items.map((i) => (
          <div key={i.label} className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 shadow-sm">
            <span className="text-lg" aria-hidden>{i.icon}</span>
            <span>{i.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
