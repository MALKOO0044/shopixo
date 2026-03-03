-- Allow service role to manage orders and order_items (needed for webhooks/admin)

-- orders
alter table orders enable row level security;
drop policy if exists "Service role can manage orders" on orders;
create policy "Service role can manage orders" on orders
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- order_items
alter table order_items enable row level security;
drop policy if exists "Service role can manage order items" on order_items;
create policy "Service role can manage order items" on order_items
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
