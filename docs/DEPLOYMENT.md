# Shopixo Deployment Guide (Production)

This guide walks you step‑by‑step to deploy Shopixo as a real store (with payments, orders, and stock management).

Important: Never share your secrets (e.g., SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) in chat. Set them only in your hosting platform’s encrypted environment settings.

---

## Prerequisites
- A Supabase project (free plan is OK to start).
- A Stripe account (Test Mode first, then Live).
- A hosting provider (Vercel recommended) and your domain.
- Node 18+ locally if you want to run and test.

---

## Step 1 — Supabase Setup
1) Create a new Supabase project (or open an existing one).
2) Get keys from: Project Settings → API
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY (server only)
3) Run database migrations (order matters):
   - Open Database → SQL Editor → paste and run the contents of `supabase/migrations/ALL.sql`, or run the following files one by one in this order:
     - `supabase/migrations/0000_schema-products.sql`
     - `supabase/migrations/0001_schema-cart.sql`
     - `supabase/migrations/0002_rpc-decrement_stock.sql`
     - `supabase/migrations/0003_orders-policies.sql`
     - `supabase/migrations/0004_rpc-decrement_stock-hardened.sql`
4) Verify tables and policies in Table Editor:
   - `products` (public read RLS; write only via service_role)
   - `cart_sessions`, `cart_items` (all operations restricted to service_role)
   - `orders`, `order_items` (service_role can manage for webhooks/admin; users can read their own orders)
   - RPC `decrement_stock` exists and is Security Definer.

---

## Step 2 — Stripe Setup
1) Create or open your Stripe account. Start with Test Mode.
2) Get your API key: Developers → API keys → Secret key → set `STRIPE_SECRET_KEY` (server only)
3) Create a Webhook endpoint:
   - URL: `https://<your-domain>/api/stripe/webhook`
   - Events: at least `checkout.session.completed`
   - Copy the Signing secret → set `STRIPE_WEBHOOK_SECRET` (server only)
4) Checkout Redirect URLs:
   - Success: `https://<your-domain>/checkout/success?session_id={CHECKOUT_SESSION_ID}`
   - Cancel: `https://<your-domain>/cart`

---

## Step 3 — Environment Variables (Production)
Set these in your hosting platform (e.g., Vercel → Project Settings → Environment Variables):

Public
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` = `https://<your-domain>`

Server-only (never expose to the client)
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Optional
- `ADMIN_EMAILS` = `admin@example.com,owner@example.com`

Do not commit real secrets to git. Use the platform’s encrypted store.

---

## Step 4 — Deploy (Vercel recommended)
1) Import your repo into Vercel and connect the project.
2) Add all environment variables listed above.
3) Configure domains (apex and www) and update DNS records as instructed by Vercel.
4) Deploy. Vercel will build and host your app.

Security headers are already configured in `next.config.mjs`.

---

## Step 5 — Production Webhook Check
- In Stripe Dashboard → Webhooks, ensure your production endpoint is enabled and points to your real domain.
- Confirm the webhook signing secret matches your `STRIPE_WEBHOOK_SECRET` in production.

---

## Step 6 — Admin Setup and Test Data
- Set `ADMIN_EMAILS` to your admin emails.
- Add a product (via Supabase Table Editor or the Admin UI once deployed):
  - `title`, `slug`, `price`, `images` (array of URLs), `stock`.
- Visit `/admin` with an admin email to manage products/orders.

---

## Step 7 — End-to-End Test (Test Mode)
1) Add the product to cart and go to checkout.
2) Pay with Stripe test card `4242 4242 4242 4242`, any future date, any CVC.
3) After success:
   - Check `orders` and `order_items` inserted.
   - `products.stock` decremented by purchased quantities.
   - `cart_items` cleared for that session.
4) Check the admin orders page: `/admin/orders`.

---

## Notes on Security and Idempotency
- Webhook handler uses Supabase service-role on the server only.
- Webhook is idempotent using `stripe_session_id` upsert and an early-exit if items already exist.
- Cart cookie `cart_id` is `secure` in production.
- RPC `decrement_stock` is SECURITY DEFINER with `search_path = public` and ignores non‑positive quantities.

---

## Troubleshooting
- If orders aren’t appearing, check:
  - Stripe Webhook logs → delivery attempts and response status.
  - Your `STRIPE_WEBHOOK_SECRET` value.
  - Supabase policies: confirm service_role access and that your server uses the service key for webhooks.
- If images don’t show, add your CDN domain to `next.config.mjs → images.remotePatterns`.

---

## Local Development (optional)
- Copy `.env.example` to `.env.local` and fill keys.
- Install deps and run dev:
  ```bash
  npm install
  npm run dev
  ```
- For local webhook testing:
  ```bash
  stripe listen --forward-to localhost:3000/api/stripe/webhook
  ```

---

You’re ready to launch. Follow the steps above in order, and verify at each step. If you need hands-on help, provide your domain and confirm when each step is done; do not share secrets. I can then double-check logs, endpoints, and flows.
