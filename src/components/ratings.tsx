type Props = { value: number; count?: number };

export default function Ratings({ value, count }: Props) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < full) return "★";
    if (i === full && half) return "☆"; // simple half representation
    return "☆";
  });
  return (
    <div className="inline-flex items-center gap-2 text-yellow-500" aria-label={`${value} stars`}>
      <span className="text-base leading-none">{stars.join(" ")}</span>
      {count != null && <span className="text-sm text-slate-600">({count})</span>}
    </div>
  );
}
