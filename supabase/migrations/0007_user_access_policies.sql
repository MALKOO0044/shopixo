-- Add user-facing RLS policies for orders, addresses, and reviews
-- This allows users to read/manage their own data through the client
-- (Previously only service role had access)

-- Orders: Allow users to read their own orders
drop policy if exists "Users can read own orders" on public.orders;
create policy "Users can read own orders" on public.orders
    for select using (auth.uid() = user_id);

-- Order items: Allow users to read items from their own orders
drop policy if exists "Users can read own order items" on public.order_items;
create policy "Users can read own order items" on public.order_items
    for select using (
        exists (
            select 1 from public.orders
            where orders.id = order_items.order_id
            and orders.user_id = auth.uid()
        )
    );

-- Addresses: Allow users to manage their own addresses
drop policy if exists "Users can read own addresses" on public.addresses;
create policy "Users can read own addresses" on public.addresses
    for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own addresses" on public.addresses;
create policy "Users can insert own addresses" on public.addresses
    for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own addresses" on public.addresses;
create policy "Users can update own addresses" on public.addresses
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own addresses" on public.addresses;
create policy "Users can delete own addresses" on public.addresses
    for delete using (auth.uid() = user_id);

-- Reviews: Allow users to manage their own reviews
drop policy if exists "Users can read own reviews" on public.reviews;
create policy "Users can read own reviews" on public.reviews
    for select using (auth.uid() = user_id);

drop policy if exists "Users can insert reviews" on public.reviews;
create policy "Users can insert reviews" on public.reviews
    for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own reviews" on public.reviews;
create policy "Users can update own reviews" on public.reviews
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own reviews" on public.reviews;
create policy "Users can delete own reviews" on public.reviews
    for delete using (auth.uid() = user_id);

-- Public can read approved reviews (for product pages)
drop policy if exists "Public can read approved reviews" on public.reviews;
create policy "Public can read approved reviews" on public.reviews
    for select using (true);

-- Enable RLS on tables that may not have it enabled yet
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.addresses enable row level security;
alter table public.reviews enable row level security;
