"use client";

import { useEffect, useState } from "react";

export default function AnnouncementBar() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("ann_bar_dismissed") === "1";
    setHidden(dismissed);
  }, []);

  if (hidden) return null;

  return (
    <div className="w-full bg-secondary/10 text-foreground">
      <div className="container flex items-center justify-between gap-4 py-2 text-sm">
        <p className="truncate">شحن مجاني للطلبات فوق 100 ريال • إرجاع خلال 30 يومًا • دفع آمن</p>
        <button
          aria-label="Dismiss announcement"
          className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            localStorage.setItem("ann_bar_dismissed", "1");
            setHidden(true);
          }}
        >
          إغلاق
        </button>
      </div>
    </div>
  );
}
