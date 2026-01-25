-- Add CJ fulfillment and tracking fields to orders
-- Timestamp: 2025-09-26 23:10 (+03:00)

alter table if exists public.orders add column if not exists cj_order_no text null;
alter table if exists public.orders add column if not exists shipping_status text null;
alter table if exists public.orders add column if not exists tracking_number text null;
alter table if exists public.orders add column if not exists carrier text null;

create index if not exists idx_orders_cj_order_no on public.orders(cj_order_no);
create index if not exists idx_orders_shipping_status on public.orders(shipping_status);
create index if not exists idx_orders_tracking_number on public.orders(tracking_number);
