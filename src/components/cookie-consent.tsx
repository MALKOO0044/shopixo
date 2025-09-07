"use client";
import { useEffect, useState } from "react";

const KEY = "shopixo_cookie_consent";

export default function CookieConsent() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const ok = localStorage.getItem(KEY);
      setOpen(!ok);
    }
  }, []);
  if (!open) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      <div className="container pb-6">
        <div className="flex items-start justify-between gap-4 rounded-xl border bg-white p-4 shadow-lg">
          <p className="text-sm text-slate-700" dir="rtl">
            نستخدم ملفات تعريف الارتباط لتحسين تجربتك وتحليل الزيارات والأغراض التسويقية. بمتابعتك للتصفح فأنت توافق على سياسة الخصوصية.
          </p>
          <div className="flex shrink-0 gap-2">
            <button className="rounded-md border px-3 py-2 text-sm" onClick={() => { localStorage.setItem(KEY, "dismiss"); setOpen(false); }}>رفض</button>
            <button className="btn-primary" onClick={() => { localStorage.setItem(KEY, "accept"); setOpen(false); }}>موافقة</button>
          </div>
        </div>
      </div>
    </div>
  );
}
