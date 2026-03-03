-- Admin jobs, inventory watch, snapshots, notifications (idempotent)

create table if not exists public.admin_jobs (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('finder','import','sync','scanner')),
  status text not null default 'pending' check (status in ('pending','running','success','error','canceled')),
  params jsonb,
  totals jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  error_text text
);

create index if not exists idx_admin_jobs_kind_created on public.admin_jobs(kind, created_at desc);
create index if not exists idx_admin_jobs_status_created on public.admin_jobs(status, created_at desc);

create table if not exists public.admin_job_items (
  id bigserial primary key,
  job_id bigint not null references public.admin_jobs(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','running','success','error','skipped','canceled')),
  step text,
  cj_product_id text,
  cj_sku text,
  result jsonb,
  error_text text,
  started_at timestamptz,
  finished_at timestamptz
);

create index if not exists idx_admin_job_items_job on public.admin_job_items(job_id);
create index if not exists idx_admin_job_items_status on public.admin_job_items(status);
create index if not exists idx_admin_job_items_cjpid on public.admin_job_items(cj_product_id);
create index if not exists idx_admin_job_items_cjsku on public.admin_job_items(cj_sku);

-- Inventory watch list for CJ-linked products/variants
create table if not exists public.cj_inventory_watch (
  id bigserial primary key,
  cj_product_id text not null,
  cj_sku text,
  threshold_low integer not null default 0,
  price_change_threshold integer not null default 5,
  watch_price boolean not null default true,
  watch_stock boolean not null default true,
  last_seen jsonb,
  created_at timestamptz not null default now(),
  unique(cj_product_id, cj_sku)
);

create index if not exists idx_cj_watch_pid on public.cj_inventory_watch(cj_product_id);
create index if not exists idx_cj_watch_sku on public.cj_inventory_watch(cj_sku);

-- Inventory snapshots over time
create table if not exists public.inventory_snapshots (
  id bigserial primary key,
  cj_product_id text not null,
  cj_sku text,
  price numeric,
  currency text,
  stock integer,
  warehouse text,
  taken_at timestamptz not null default now()
);

create index if not exists idx_inventory_snapshots_pid on public.inventory_snapshots(cj_product_id);
create index if not exists idx_inventory_snapshots_pid_sku_time on public.inventory_snapshots(cj_product_id, cj_sku, taken_at desc);

-- Notifications inbox
create table if not exists public.notifications (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  type text not null,
  title text not null,
  body text,
  meta jsonb,
  status text not null default 'unread' check (status in ('unread','read','archived'))
);

create index if not exists idx_notifications_status_created on public.notifications(status, created_at desc);

-- Enrich product_variants with supplier/retail breakdown (idempotent)
alter table if exists public.product_variants add column if not exists supplier_cost_sar numeric;
alter table if exists public.product_variants add column if not exists ddp_shipping_sar numeric;
alter table if exists public.product_variants add column if not exists landed_cost_sar numeric;
alter table if exists public.product_variants add column if not exists retail_sar numeric;
alter table if exists public.product_variants add column if not exists retail_updated_at timestamptz;
