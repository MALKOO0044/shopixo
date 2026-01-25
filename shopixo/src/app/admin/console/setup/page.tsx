import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DbSetupPage() {
  async function dbStatus() {
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/admin/db/status`, { cache: 'no-store' });
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  }
  const status = await dbStatus();

  const sqlKv = `-- Key-Value settings (operating_mode, kill_switch, etc.)
create table if not exists kv_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
`;

  const sqlProposals = `-- Proposals queue for Monitor/Copilot/Autopilot
-- Requires pgcrypto for gen_random_uuid(); run once:
create extension if not exists pgcrypto;

create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','approved','rejected','executed')),
  action_type text,             -- e.g., 'price_update', 'archive', 'media_update'
  entity_type text,             -- e.g., 'product', 'variant'
  entity_id text,               -- e.g., product id or variant id
  score numeric,                -- quality/priority score (0..5)
  reasons jsonb,                -- list of reasons/policies triggered
  impact jsonb,                 -- expected impact (e.g., margin, CVR)
  payload jsonb,                -- full proposal payload (before/after)
  proposed_by text,             -- generator id ('system')
  mode text,                    -- 'monitor'|'copilot'|'autopilot' at creation
  tags text[]
);

create index if not exists proposals_status_created_at_idx on proposals(status, created_at desc);
`;

  const sqlAudit = `-- Audit trail of administrative actions
create table if not exists audit_logs (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  action text not null,
  entity text,
  entity_id text,
  user_email text,
  user_id text,
  payload jsonb
);

create index if not exists audit_logs_action_created_idx on audit_logs(action, created_at desc);
`;

  return (
    <div className="space-y-8">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Database Setup</h1>
        <Link href="/admin/console" className="text-sm text-blue-600 hover:underline">Back to Console</Link>
      </header>

      <section className="rounded border bg-white p-4">
        <h2 className="text-lg font-medium mb-2">Current Status</h2>
        <div className="text-sm text-muted-foreground">
          {status && status.ok ? (
            <ul className="list-disc pl-5">
              <li>kv_settings: <span className="font-medium">{String(status.tables.kv_settings)}</span></li>
              <li>proposals: <span className="font-medium">{String(status.tables.proposals)}</span></li>
              <li>audit_logs: <span className="font-medium">{String(status.tables.audit_logs)}</span></li>
              <li>pricing_policies: <span className="font-medium">{String(status.tables.pricing_policies)}</span></li>
            </ul>
          ) : <div>Open <Link href="/api/admin/db/status" className="text-blue-600 hover:underline">DB Status</Link></div>}
        </div>
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="text-lg font-medium mb-2">1) kv_settings</h2>
        <p className="text-sm text-muted-foreground mb-2">Run in Supabase SQL editor:</p>
        <pre className="overflow-auto rounded bg-slate-950 p-3 text-slate-50 text-xs"><code>{sqlKv}</code></pre>
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="text-lg font-medium mb-2">2) proposals</h2>
        <p className="text-sm text-muted-foreground mb-2">Run in Supabase SQL editor:</p>
        <pre className="overflow-auto rounded bg-slate-950 p-3 text-slate-50 text-xs"><code>{sqlProposals}</code></pre>
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="text-lg font-medium mb-2">3) audit_logs</h2>
        <p className="text-sm text-muted-foreground mb-2">Run in Supabase SQL editor:</p>
        <pre className="overflow-auto rounded bg-slate-950 p-3 text-slate-50 text-xs"><code>{sqlAudit}</code></pre>
      </section>

      <section className="rounded border bg-yellow-100 p-4">
        <h3 className="font-medium mb-1">Notes</h3>
        <ul className="list-disc pl-5 text-sm text-yellow-900 space-y-1">
          <li>No destructive changes are executed automatically. You apply SQL explicitly in Supabase.</li>
          <li>After creating the tables, revisit <Link href="/admin/console/proposals" className="underline">Proposals</Link> and <Link href="/admin/console/settings" className="underline">Settings</Link>.</li>
        </ul>
      </section>
    </div>
  );
}
