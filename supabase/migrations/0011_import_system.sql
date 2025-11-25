-- CJ Dropshipping Product Import System Schema
-- Created: November 2025

-- Pricing rules per category
create table if not exists public.pricing_rules (
  id bigserial primary key,
  category_slug text not null unique,
  margin_percent numeric(5,2) not null default 50,
  min_profit_sar numeric(12,2) not null default 25,
  max_price_sar numeric(12,2) null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pricing_rules_category on public.pricing_rules(category_slug);
create index if not exists idx_pricing_rules_active on public.pricing_rules(is_active);

-- Import batches (search sessions)
create table if not exists public.import_batches (
  id bigserial primary key,
  name text not null,
  search_keyword text null,
  category_id text null,
  filters jsonb null,
  status text not null default 'pending' check (status in ('pending', 'searching', 'ready', 'importing', 'completed', 'failed')),
  total_found integer not null default 0,
  total_approved integer not null default 0,
  total_imported integer not null default 0,
  total_rejected integer not null default 0,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_import_batches_status on public.import_batches(status);
create index if not exists idx_import_batches_created on public.import_batches(created_at desc);

-- Product queue (products awaiting approval)
create table if not exists public.product_queue (
  id bigserial primary key,
  batch_id bigint not null references public.import_batches(id) on delete cascade,
  cj_product_id text not null,
  cj_sku text not null,
  name_en text not null,
  name_ar text null,
  description_en text null,
  description_ar text null,
  images jsonb not null default '[]',
  video_url text null,
  category_id text null,
  category_name text null,
  cj_price_usd numeric(12,2) not null,
  shipping_usd numeric(12,2) not null default 0,
  final_price_sar numeric(12,2) not null,
  margin_percent numeric(5,2) not null,
  profit_sar numeric(12,2) not null,
  total_stock integer not null default 0,
  variants jsonb not null default '[]',
  delivery_days text null,
  processing_days text null,
  rating numeric(3,2) null,
  listed_count integer null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'imported', 'failed')),
  needs_review boolean not null default false,
  review_reason text null,
  admin_notes text null,
  shopixo_product_id bigint null,
  shopixo_sku text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_product_queue_batch_cj on public.product_queue(batch_id, cj_product_id);
create index if not exists idx_product_queue_batch on public.product_queue(batch_id);
create index if not exists idx_product_queue_status on public.product_queue(status);
create index if not exists idx_product_queue_needs_review on public.product_queue(needs_review) where needs_review = true;
create index if not exists idx_product_queue_cj_sku on public.product_queue(cj_sku);

-- Import logs (audit trail)
create table if not exists public.import_logs (
  id bigserial primary key,
  batch_id bigint null references public.import_batches(id) on delete set null,
  queue_item_id bigint null references public.product_queue(id) on delete set null,
  action text not null,
  status text not null default 'success' check (status in ('success', 'warning', 'error')),
  message text null,
  details jsonb null,
  created_by uuid null,
  created_at timestamptz not null default now()
);

create index if not exists idx_import_logs_batch on public.import_logs(batch_id);
create index if not exists idx_import_logs_queue_item on public.import_logs(queue_item_id);
create index if not exists idx_import_logs_action on public.import_logs(action);
create index if not exists idx_import_logs_created on public.import_logs(created_at desc);

-- Daily sync changes (for morning review)
create table if not exists public.daily_sync_changes (
  id bigserial primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  cj_product_id text not null,
  change_type text not null check (change_type in ('price', 'stock', 'shipping', 'availability', 'description', 'images')),
  old_value text null,
  new_value text null,
  change_amount numeric(12,2) null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'auto_applied')),
  detected_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  reviewed_by uuid null
);

create index if not exists idx_daily_sync_product on public.daily_sync_changes(product_id);
create index if not exists idx_daily_sync_status on public.daily_sync_changes(status);
create index if not exists idx_daily_sync_detected on public.daily_sync_changes(detected_at desc);
create index if not exists idx_daily_sync_type on public.daily_sync_changes(change_type);

-- SKU sequence for unique Shopixo SKUs
create sequence if not exists shopixo_sku_seq start with 1000;

-- Function to generate unique Shopixo SKU
create or replace function generate_shopixo_sku(category_prefix text default 'GEN')
returns text
language plpgsql
as $$
declare
  seq_val bigint;
  prefix text;
begin
  prefix := upper(substring(coalesce(nullif(category_prefix, ''), 'GEN') from 1 for 3));
  seq_val := nextval('shopixo_sku_seq');
  return 'SPX-' || prefix || '-' || lpad(seq_val::text, 5, '0');
end;
$$;

-- Enable RLS on all import tables
alter table public.pricing_rules enable row level security;
alter table public.import_batches enable row level security;
alter table public.product_queue enable row level security;
alter table public.import_logs enable row level security;
alter table public.daily_sync_changes enable row level security;

-- RLS policies: Service role only for all import tables
drop policy if exists "Service role manages pricing_rules" on public.pricing_rules;
create policy "Service role manages pricing_rules" on public.pricing_rules
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role manages import_batches" on public.import_batches;
create policy "Service role manages import_batches" on public.import_batches
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role manages product_queue" on public.product_queue;
create policy "Service role manages product_queue" on public.product_queue
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role manages import_logs" on public.import_logs;
create policy "Service role manages import_logs" on public.import_logs
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role manages daily_sync_changes" on public.daily_sync_changes;
create policy "Service role manages daily_sync_changes" on public.daily_sync_changes
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Insert default pricing rules
insert into public.pricing_rules (category_slug, margin_percent, min_profit_sar) values
  ('clothing', 50, 25),
  ('shoes', 55, 30),
  ('electronics', 40, 35),
  ('home', 60, 20),
  ('kitchen', 55, 20),
  ('beauty', 65, 15),
  ('jewelry', 70, 20),
  ('bags', 55, 25),
  ('watches', 60, 35),
  ('default', 50, 25)
on conflict (category_slug) do nothing;
