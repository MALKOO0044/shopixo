"use client";

import React from "react";

export default function BrandReviewPage() {
  const setAccent = (hex: string) => {
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--accent", hex);
      const el = document.getElementById("swAccent");
      if (el) {
        (el as HTMLElement).style.backgroundColor = hex;
        const span = el.querySelector("span");
        if (span) span.textContent = hex;
      }
    }
  };

  return (
    <div>
      <style>{`
        :root{ --brand:#111111; --bg:#ffffff; --accent:#2563EB; --muted:#6b7280; }
        *{ box-sizing:border-box; }
        body{ margin:0; font-family: Inter, Cairo, Arial, Helvetica, sans-serif; color:#111; background:#fff; }
        /* Hide global store chrome on this preview page only */
        header.sticky.top-0{ display:none !important; }
        nav{ display:none !important; }
        footer{ display:none !important; }
        header{ position:sticky; top:0; background:#fff; border-bottom:1px solid #eee; padding:12px 16px; display:flex; align-items:center; justify-content:space-between; gap:8px; }
        header .l{ display:flex; align-items:center; gap:12px; }
        header img{ height:28px; }
        .wrap{ max-width:1100px; margin:0 auto; padding:18px 16px 40px; }
        h1{ font-size:20px; margin:6px 0 12px; }
        h2{ font-size:18px; margin:22px 0 10px; }
        p{ margin:8px 0; color:#333; }
        .row{ display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .card{ border:1px solid #eee; border-radius:10px; padding:14px; background:#fff; }
        .swatches{ display:flex; flex-wrap:wrap; gap:10px; }
        .swatch{ width:110px; height:64px; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; box-shadow:0 0 0 1px rgba(0,0,0,.05) inset; }
        .swatch span{ background:rgba(0,0,0,.35); padding:2px 6px; border-radius:6px; font-size:12px; }
        .grid-logos{ display:grid; grid-template-columns:1fr 1fr; gap:12px; align-items:center; }
        .logo-box{ border:1px dashed #ddd; border-radius:10px; background:#fafafa; display:flex; align-items:center; justify-content:center; padding:16px; }
        .logo-box.dark{ background:#111; }
        .logo-box img{ max-width:100%; height:64px; }
        .toolbar{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        button{ background:var(--accent); color:#fff; border:0; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:700; }
        .muted{ color:var(--muted); font-size:12px; }
        iframe{ width:100%; height:330px; border:1px solid #eee; border-radius:10px; background:#fff; }
        .checklist li{ margin:6px 0; }
        .pill{ display:inline-block; padding:2px 8px; border:1px solid #eee; border-radius:999px; font-size:12px; color:#333; background:#fafafa; }
      `}</style>

      <header>
        <div className="l">
          <img src="/brand/logo-shopixo-wordmark.svg" alt="Shopixo" />
          <strong>لوحة مراجعة العلامة | Brand Review</strong>
        </div>
        <div className="toolbar">
          <button onClick={() => setAccent("#2563EB")}>Accent أزرق</button>
          <button onClick={() => setAccent("#0EA5E9")}>Accent تركوازي</button>
          <span className="pill">Shipper Name: Shopixo</span>
          <span className="pill">WhatsApp: 00962781637033</span>
        </div>
      </header>

      <main className="wrap">
        <section className="card">
          <h1>الشعار</h1>
          <div className="grid-logos">
            <div>
              <div className="muted">Wordmark على خلفية فاتحة</div>
              <div className="logo-box">
                <img src="/brand/logo-shopixo-wordmark.svg" alt="Shopixo wordmark" />
              </div>
            </div>
            <div>
              <div className="muted">Wordmark على خلفية داكنة</div>
              <div className="logo-box dark">
                <img src="/brand/logo-shopixo-wordmark-white.svg" alt="Shopixo wordmark (white)" />
              </div>
            </div>
          </div>
          <div style={{ height: 12 }} />
          <div className="grid-logos">
            <div>
              <div className="muted">نسخة الحقيبة — فاتح</div>
              <div className="logo-box">
                <img src="/brand/logo-shopixo-bag.svg" alt="Shopixo with bag" />
              </div>
            </div>
            <div>
              <div className="muted">نسخة الحقيبة — داكن</div>
              <div className="logo-box dark">
                <img src="/brand/logo-shopixo-bag-white.svg" alt="Shopixo with bag (white)" />
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <h2>الألوان</h2>
          <div className="swatches">
            <div className="swatch" style={{ background: "#111111" }}><span>#111111</span></div>
            <div className="swatch" style={{ background: "#FFFFFF", color: "#111" }}><span>#FFFFFF</span></div>
            <div id="swAccent" className="swatch" style={{ background: "#2563EB" }}><span>#2563EB</span></div>
            <div className="swatch" style={{ background: "#374151" }}><span>#374151</span></div>
            <div className="swatch" style={{ background: "#9CA3AF" }}><span>#9CA3AF</span></div>
            <div className="swatch" style={{ background: "#F59E0B" }}><span>#F59E0B</span></div>
          </div>
          <p className="muted">يمكن تغيير لون الـ Accent مؤقتاً بالأزرار أعلى الصفحة لمعاينة الإحساس البصري.</p>
        </section>

        <section className="row">
          <div className="card">
            <h2>قسيمة التغليف (Packing Slip)</h2>
            <iframe src="/brand/packing-slip" title="Packing Slip" />
            <p className="muted">تُعرَض القسيمة بحجم A5. تحقّق من ترتيب النصوص بالعربية ووضوح المعلومات.</p>
          </div>
          <div className="card">
            <h2>بطاقة الشكر (Thank-You)</h2>
            <iframe src="/brand/thank-you-insert" title="Thank You Insert" />
            <p className="muted">الـ QR يفتح واتساب 00962781637033. تأكد من ملاءمة الخط والهوامش.</p>
          </div>
        </section>

        <section className="card">
          <h2>قائمة قرارات سريعة</h2>
          <ul className="checklist">
            <li>اختر الشعار للاستخدام في الهيدر: <strong>Wordmark</strong> أم <strong>نسخة الحقيبة</strong>؟</li>
            <li>اعتماد لون الـ Accent: الأزرق (#2563EB) أم تفضّل تركوازي (#0EA5E9)؟</li>
            <li>هل الخط مناسب؟ (Inter + Cairo/Tajawal)</li>
            <li>هل نصوص الـ Packing Slip وبطاقة الشكر مناسبة؟ هل نعدّل البريد/النص؟</li>
            <li>اعتماد اسم المرسل: <strong>Shopixo</strong> — تأكيد نهائي؟</li>
          </ul>
          <p>بعد الاعتماد، سأطبّق الهوية على واجهة المتجر ونبدأ مباشرة باعتماد الموردين وطلبات الاختبار.</p>
        </section>
      </main>
    </div>
  );
}
