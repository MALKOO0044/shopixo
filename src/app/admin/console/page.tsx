import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminConsolePage() {
  // This page assumes admin access via /admin layout guard
  // It surfaces real, existing admin endpoints as quick actions
  const sections: { title: string; items: { label: string; href: string; desc?: string }[] }[] = [
    {
      title: "CJ Diagnostics",
      items: [
        {
          label: "Probe CJ Token & Endpoints (kw=dress)",
          href: "/api/admin/cj/diag?kw=dress",
          desc: "Checks access token and multiple product search endpoints",
        },
      ],
    },
    {
      title: "Admin",
      items: [
        { label: "Settings (Mode & Kill‑Switch)", href: "/admin/console/settings", desc: "Toggle Monitor/Copilot/Autopilot and kill‑switch" },
        { label: "Proposals (Review Queue)", href: "/admin/console/proposals", desc: "List, approve, reject, mark executed" },
        { label: "DB Setup (SQL)", href: "/admin/console/setup", desc: "SQL to create kv_settings, proposals, audit_logs" },
      ],
    },
    {
      title: "Catalog Cleanup",
      items: [
        {
          label: "Clear All Products (safe) — confirm=1",
          href: "/api/admin/products/clear?confirm=1",
          desc: "Hard-deletes unreferenced products; deactivates referenced ones",
        },
      ],
    },
    {
      title: "CJ Import (Automatic)",
      items: [
        {
          label: "Auto‑Import 2 Products (women dress, women sneakers)",
          href: "/api/admin/cj/products/auto-import?keywords=women%20dress,women%20sneakers&limit=2",
          desc: "Fetches top candidates, deduped by CJ product ID, then upserts",
        },
      ],
    },
    {
      title: "Sync & Pricing",
      items: [
        {
          label: "Sync — updateRetail=true (DDP+margin), updateImages, updateVideo",
          href:
            "/api/admin/cj/sync?updateRetail=true&margin=0.35&handlingSar=0&cjCurrency=USD&updateImages=true&updateVideo=true&limit=50&offset=0",
          desc: "Computes retail incl. DDP, updates variant/product price, media, stock",
        },
      ],
    },
    {
      title: "Utilities",
      items: [
        { label: "View Shop", href: "/shop" },
        { label: "Home", href: "/" },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Admin Console</h1>
        <span className="text-sm text-gray-500">Real endpoints • Admin only</span>
      </header>

      {sections.map((s) => (
        <section key={s.title} className="bg-white rounded border p-4">
          <h2 className="text-lg font-medium mb-3">{s.title}</h2>
          <ul className="space-y-2">
            {s.items.map((it) => (
              <li key={it.href} className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium">{it.label}</div>
                  {it.desc ? <div className="text-sm text-gray-500">{it.desc}</div> : null}
                </div>
                <Link
                  href={it.href}
                  className="inline-flex items-center rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="bg-yellow-50 border border-yellow-200 rounded p-4">
        <h3 className="font-medium mb-2">Notes</h3>
        <ul className="list-disc pl-5 text-sm text-yellow-800 space-y-1">
          <li>Actions are executed immediately and logged via API routes. Ensure you are signed in as an admin.</li>
          <li>Pricing uses retail inclusive of DDP shipping (Saudi Arabia) with a 35% margin by default.</li>
          <li>Auto‑import prevents duplicates by CJ product ID and preserves high‑res images and video when available.</li>
        </ul>
      </section>
    </div>
  );
}
