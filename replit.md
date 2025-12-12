# Overview

Shopixo is a modern, professional e-commerce platform designed for the Saudi Arabian market. It provides a bilingual (Arabic/English with RTL support) shopping experience, secure payment processing, and efficient dropshipping fulfillment. The platform aims to offer a curated selection of products, emphasizing security, speed, and a strong content policy.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
Shopixo utilizes Next.js 14 (App Router) with TypeScript for server-side rendering, streaming, and code splitting. Styling is managed with Tailwind CSS, incorporating a custom gold/navy HSL color palette and design tokens. UI components are built using Radix UI primitives, styled with shadcn/ui patterns and `class-variance-authority`, ensuring accessibility. It supports dark/light mode via `next-themes` and full internationalization with RTL design for Arabic using CSS and HTML `dir` attributes. Lucide React provides consistent iconography.

## Backend Architecture
The backend leverages Next.js API routes and React Server Components. Supabase (PostgreSQL with Row Level Security) is the primary database, handling data and authentication via Supabase Auth and `auth-helpers-nextjs`. Stripe processes payments, utilizing checkout sessions and webhooks for order fulfillment. Rate limiting for API protection is implemented with Upstash Redis and `@upstash/ratelimit`. Error tracking is optional via Sentry. Server Components directly fetch data from Supabase, Server Actions handle mutations, and webhooks trigger backend processes for orders and inventory.

## Data Storage
Supabase (PostgreSQL) is used for all data. Key schemas include `products`, `cart_sessions`/`cart_items`, `orders`/`order_items`, and `blog_posts`. An RPC function `decrement_stock` handles atomic inventory management. Row Level Security (RLS) policies enforce data access control: public read for products, service role only for cart, and user-specific order access.

## Authentication & Authorization
Supabase Auth manages user authentication, including OAuth and magic links, with session management handled by server-side cookies via `@supabase/auth-helpers-nextjs`. Middleware protects routes like `/account/*` and `/admin/*`. Admin access is role-based.

## Security Architecture
A strict Content Security Policy (CSP) is enforced using per-request nonces for inline scripts, blocking unsafe-inline/unsafe-eval. Allowed domains include Stripe, Supabase, Cloudinary, Plausible, Sentry, and OpenAI. Rate limiting is applied to API routes using Upstash Redis. The production environment uses HTTPS-only via Vercel, and sensitive data is stored in Vercel environment variables.

## Testing Strategy
The project employs Jest and React Testing Library for unit tests on components, and Playwright for end-to-end testing of critical user flows (e.g., checkout, navigation). Mocks are used for Next.js components and Radix UI portals. Tests run on CI/CD with GitHub Actions, including production smoke tests.

# External Dependencies

## Third-Party Services

**Supabase:**
- **Purpose:** Database, authentication, real-time features.
- **Integration:** Server-side client with service role for admin, anon key for public reads.
- **Environment Variables:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

**Stripe:**
- **Purpose:** Payment processing (cards, Apple Pay), order confirmation via webhooks.
- **Integration:** `@stripe/stripe-js` (client), `stripe` Node SDK (server), checkout sessions.
- **Environment Variables:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

**CJ Dropshipping:**
- **Purpose:** Product sourcing, fulfillment, shipping calculation.
- **Integration:** Custom API client for batch product sync, webhooks for tracking updates.
- **Environment Variables:** `CJ_API_BASE`, `CJ_API_KEY` or `CJ_ACCESS_TOKEN`, `CJ_EMAIL`, `CJ_WEBHOOK_SECRET`.

**Upstash Redis:**
- **Purpose:** Rate limiting for API routes.
- **Integration:** `@upstash/ratelimit` + `@upstash/redis`.
- **Environment Variables:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

**Sentry (Optional):**
- **Purpose:** Error tracking and performance monitoring.
- **Integration:** Conditionally loaded based on `SENTRY_DSN`.
- **Environment Variable:** `SENTRY_DSN`.

**OpenAI (Optional):**
- **Purpose:** AI-powered customer support chat widget.
- **Integration:** `/api/chat` endpoint.
- **Environment Variables:** `OPENAI_API_KEY`, `AI_MODEL_TEXT`.

## Payment Gateways (KSA Focus)
- **Primary:** Stripe (cards, Apple Pay).
- **Future:** COD (Cash on Delivery) support.

## Deployment & Hosting
- **Platform:** Vercel.
- **Build Command:** `npm run build`.
- **Static Assets:** Served from `/public`.

## Analytics & Monitoring
- **Plausible Analytics (Optional):** Privacy-friendly web analytics.
- **Sentry (Optional):** Application monitoring and error reporting.