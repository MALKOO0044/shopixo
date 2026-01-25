-- Shopixo baseline schema (init)
-- Generated on 2025-09-16 23:48 (+03:00)

-- Extensions (for UUID generation)
create extension if not exists pgcrypto;

-- Products
create table if not exists public.products (
  id bigserial primary key,
  title text not null,
  slug text not null unique,
  description text default '' not null,
  price numeric(12,2) not null default 0,
  images text[] not null default '{}',
  category text default 'General' not null,
  rating numeric(3,2) default 0,
  stock integer not null default 0,
  is_active boolean default true,
  user_id uuid null,
  created_at timestamp with time zone not null default now()
);
create index if not exists idx_products_is_active on public.products(is_active);
create index if not exists idx_products_category on public.products(category);

-- Cart sessions
create table if not exists public.cart_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  created_at timestamp with time zone not null default now()
);
create index if not exists idx_cart_sessions_user on public.cart_sessions(user_id);

-- Cart items
create table if not exists public.cart_items (
  id bigserial primary key,
  session_id uuid not null references public.cart_sessions(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity >= 1),
  created_at timestamp with time zone not null default now()
);
create index if not exists idx_cart_items_session on public.cart_items(session_id);
create index if not exists idx_cart_items_product on public.cart_items(product_id);

-- Orders
create table if not exists public.orders (
  id bigserial primary key,
  user_id uuid not null,
  total_amount numeric(12,2) not null default 0,
  status text not null default 'pending' check (status in ('pending','processing','shipped','delivered','cancelled','paid')),
  stripe_session_id text null unique,
  created_at timestamp with time zone not null default now()
);
create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);

-- Order items
create table if not exists public.order_items (
  id bigserial primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity >= 1),
  price numeric(12,2) not null,
  created_at timestamp with time zone not null default now()
);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_items_product on public.order_items(product_id);

-- Addresses
create table if not exists public.addresses (
  id bigserial primary key,
  user_id uuid not null,
  full_name text not null,
  phone text null,
  line1 text not null,
  line2 text null,
  city text not null,
  state text null,
  postal_code text null,
  country text not null,
  is_default boolean not null default false,
  created_at timestamp with time zone not null default now()
);
create index if not exists idx_addresses_user on public.addresses(user_id);

-- Reviews
create table if not exists public.reviews (
  id bigserial primary key,
  user_id uuid not null,
  product_id bigint not null references public.products(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text null,
  body text null,
  created_at timestamp with time zone not null default now()
);
create index if not exists idx_reviews_product on public.reviews(product_id);
create index if not exists idx_reviews_user on public.reviews(user_id);

-- Blog posts
create table if not exists public.blog_posts (
  id bigserial primary key,
  title text not null,
  slug text not null unique,
  excerpt text null,
  content text null,
  published boolean not null default true,
  created_at timestamp with time zone not null default now()
);

-- Newsletter subscribers
create table if not exists public.newsletter_subscribers (
  id bigserial primary key,
  email text not null unique,
  created_at timestamp with time zone not null default now()
);

-- Contact messages
create table if not exists public.contact_messages (
  id bigserial primary key,
  name text not null,
  email text not null,
  message text not null,
  created_at timestamp with time zone not null default now()
);

-- RPC: decrement_stock(product_id_in, quantity_in)
create or replace function public.decrement_stock(product_id_in bigint, quantity_in integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
    set stock = greatest(stock - quantity_in, 0)
  where id = product_id_in;
end;
$$;

-- Helpful unique indices
create unique index if not exists uq_products_slug on public.products(slug);
create unique index if not exists uq_blog_posts_slug on public.blog_posts(slug);
