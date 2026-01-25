-- Import System Tables: import_batches, product_queue, import_logs (idempotent)

-- 1) Import batches - tracks each import session
create table if not exists public.import_batches (
  id bigserial primary key,
  name text not null,
  keywords text,
  category text default 'General',
  filters jsonb default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  products_found integer not null default 0,
  products_approved integer not null default 0,
  products_imported integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists import_batches_status_idx on public.import_batches(status);
create index if not exists import_batches_created_at_idx on public.import_batches(created_at desc);

alter table public.import_batches enable row level security;
drop policy if exists "Service role can manage import_batches" on public.import_batches;
create policy "Service role can manage import_batches" on public.import_batches
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- 2) Product queue - stores products pending review/import
create table if not exists public.product_queue (
  id bigserial primary key,
  batch_id bigint references public.import_batches(id) on delete set null,
  cj_product_id text not null unique,
  cj_sku text,
  name_en text not null,
  name_ar text,
  description_en text,
  description_ar text,
  category text default 'General',
  images jsonb default '[]'::jsonb,
  video_url text,
  variants jsonb default '[]'::jsonb,
  cj_price_usd numeric(10,2),
  shipping_cost_usd numeric(10,2),
  calculated_retail_sar numeric(10,2),
  margin_applied numeric(5,2),
  supplier_rating numeric(3,2) default 4.0,
  total_sales integer default 0,
  stock_total integer default 0,
  processing_days integer default 3,
  delivery_days_min integer default 7,
  delivery_days_max integer default 15,
  quality_score numeric(5,4) default 0.75,
  status text not null default 'pending' check (status in ('pending','approved','rejected','imported')),
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  shopixo_product_id uuid,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_queue_status_idx on public.product_queue(status);
create index if not exists product_queue_batch_id_idx on public.product_queue(batch_id);
create index if not exists product_queue_cj_product_id_idx on public.product_queue(cj_product_id);
create index if not exists product_queue_quality_score_idx on public.product_queue(quality_score desc);

alter table public.product_queue enable row level security;
drop policy if exists "Service role can manage product_queue" on public.product_queue;
create policy "Service role can manage product_queue" on public.product_queue
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- 3) Import logs - audit trail for import operations
create table if not exists public.import_logs (
  id bigserial primary key,
  batch_id bigint references public.import_batches(id) on delete set null,
  action text not null,
  status text not null default 'success' check (status in ('success','error','warning')),
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists import_logs_batch_id_idx on public.import_logs(batch_id);
create index if not exists import_logs_action_idx on public.import_logs(action);
create index if not exists import_logs_created_at_idx on public.import_logs(created_at desc);

alter table public.import_logs enable row level security;
drop policy if exists "Service role can manage import_logs" on public.import_logs;
create policy "Service role can manage import_logs" on public.import_logs
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
