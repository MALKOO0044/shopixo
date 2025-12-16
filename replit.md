# Overview

Shopixo is a modern, professional e-commerce platform designed for the USA market. It provides an English-only (LTR layout) shopping experience, secure payment processing via Stripe, and efficient dropshipping fulfillment through CJ Dropshipping. The platform offers a curated selection of products, emphasizing security, speed, and a strong content policy.

# Recent Changes (December 2025)

## Full Localization to USA Market (December 16, 2025)
- **Change**: Converted platform from Saudi Arabia market (Arabic/RTL/SAR) to USA market (English/LTR/USD)
- **Scope**: Complete translation of 150+ files including:
  - Layout direction: RTL → LTR (root layout)
  - All admin pages (sync, inventory, import, products, CJ settings)
  - All 6 product preview pages (PreviewPageOne through PreviewPageSix)
  - CATEGORIES array (35 main categories)
  - FULL_CATEGORIES array (800+ lines including all subcategories)
  - Currency display: SAR (ر.س) → USD ($)
- **Note**: Shipping logic intentionally unchanged - will be updated separately for US shipping methods

## Estimated Rating System for All Products (December 12, 2025)
- **Issue**: CJ Dropshipping deprecated their reviews/comments API in June 2024 - no real rating data available
- **Solution**: Implemented "Shopixo Estimated Rating" based on product popularity (listedNum)
- **How it works**:
  - All products now display star ratings (3.8 - 4.8 range)
  - Rating is deterministic based on listedNum popularity metric
  - Review count estimated as 15% of listings
  - Tooltip explains it's an estimated rating based on supplier data
- **Rating Algorithm** (listedNum thresholds):
  - 2000+ → 4.8 stars, 1000-1999 → 4.7 stars, 500-999 → 4.5 stars
  - 200-499 → 4.3 stars, 100-199 → 4.2 stars, 50-99 → 4.0 stars
  - 20-49 → 3.9 stars, <20 → 3.8 stars
- **Rating Filter on Discover Page**: Filter by minimum rating (3+, 3.5+, 4+, 4.5+ stars)
- **Files Modified**:
  - `src/components/admin/import/preview/PreviewPageOne.tsx` - Star rating display
  - `src/app/admin/import/discover/page.tsx` - Rating filter dropdown
  - `src/app/api/admin/cj/products/search-and-price/route.ts` - Rating filter logic

## Real CJ Variant Sizes Display (December 13, 2025)
- **Issue**: Static size filter showed wrong generic sizes instead of actual CJ variant data
  - Example: Phone cases showed "12, 8, 7, XS, 11" instead of real sizes like "iPhone 13Pro, iPhone 7/8/SE"
- **Solution**: Sizes are now extracted from real CJ variant data
- **How it works**:
  - API extracts sizes from explicit fields (v.size, v.sizeNameEn)
  - Checks variant properties for size/model/type/version data
  - Falls back to variantKey (captures phone models like "iPhone 13Pro")
  - Final fallback to variantNameEn parsing
- **UI Change**: Removed static pre-fetch size filter (sizes vary by product, not predictable)
- **PreviewPageOne**: Shows actual `availableSizes` from CJ data
- **Files Modified**:
  - `src/app/api/admin/cj/products/search-and-price/route.ts` - Size extraction logic
  - `src/app/admin/import/discover/page.tsx` - Removed static size filter

## Shipping Method Filter and Detailed Pricing Breakdown (December 16, 2025)
- **New Feature**: Shipping Method filter on Discover page
  - Dropdown filter to select specific shipping method: CJPacket, ePacket, USPS, EMS, DHL, FedEx, UPS
  - When selected, only products offering that shipping method are returned
  - Default is "Any Method" which uses the cheapest available option
- **Enhanced PreviewPageFive** (Shipping & Delivery):
  - New price breakdown section: Product Cost, Shipping Cost, Total Cost, Sell Price, Profit
  - Full table of ALL available shipping methods to USA with:
    - Method name, delivery time, shipping cost
    - Total cost with shipping, estimated sell price
    - Visual indicator for cheapest option
  - Processing & handling time display
  - Delivery time cards and shipping cost range
- **Enhanced PreviewPageSix** (Pricing Details):
  - Summary cards: Total Product Cost, Total Shipping, Total Revenue, Total Profit
  - Per-variant pricing table with shipping method and delivery time columns
  - Visual variant images and shipping method indicators
- **Files Modified**:
  - `src/app/admin/import/discover/page.tsx` - Added shippingMethod state and UI filter
  - `src/components/admin/import/preview/PreviewPageFive.tsx` - Complete rewrite with shipping breakdown
  - `src/components/admin/import/preview/PreviewPageSix.tsx` - Enhanced with shipping details per variant
  - `src/components/admin/import/preview/types.ts` - ShippingOption type already defined

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
Shopixo utilizes Next.js 14 (App Router) with TypeScript for server-side rendering, streaming, and code splitting. Styling is managed with Tailwind CSS, incorporating a custom gold/navy HSL color palette and design tokens. UI components are built using Radix UI primitives, styled with shadcn/ui patterns and `class-variance-authority`, ensuring accessibility. It supports dark/light mode via `next-themes`. Lucide React provides consistent iconography.

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