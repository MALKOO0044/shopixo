# Overview

Shopixo is a modern, professional e-commerce platform targeting the Saudi Arabian market. Built with Next.js 14 (App Router) and TypeScript, it features a bilingual interface (Arabic/English RTL support), integrates with Supabase for data storage, Stripe for payments, and CJ Dropshipping for product fulfillment. The application emphasizes secure checkout, fast delivery, content security policies, and a curated shopping experience with categories ranging from apparel to home goods.

---

# Recent Changes (November 2025)

## Product Discovery & Import Fixes (Latest - November 29, 2025)
- **Fixed Database Issue**: Created PostgreSQL database with proper tables (import_batches, product_queue, import_logs)
- **Fixed Quantity Issue**: 
  - Increased max products limit from 100 to 500
  - Increased page fetching from 20 to 50+ pages
  - System now fetches enough pages to meet requested quantity
- **Fixed Search Accuracy with Two-Phase Matching**:
  - Phase 1: Strict matching (products must match ALL required concepts)
  - Phase 2: Relaxed matching (accepts 50% concept match or keyword substring matches)
  - Combined results sorted by match score for best quality
- **Smart Fallback System**: If strict mode doesn't return enough products, relaxed matches fill the gap

## Product Discovery Search System (November 2025)
- **Keyword Lexicon Module** (`src/lib/search/keyword-lexicon.ts`):
  - 35+ product concepts (dress, shirt, shoes, bags, jewelry, etc.)
  - Each concept has canonical name + synonyms (e.g., dress includes gown, frock, maxi, bodycon, etc.)
  - N-gram matching (3-grams, 2-grams, 1-grams) for multi-word phrases
  - Gender classification (female/male/neutral) with exclusion rules
  - Compound word splitting (smartwatch → smart watch, tshirt → t shirt, etc.)
  
- **CJ Categories Integration**:
  - Fetches categories directly from CJ API (`/product/getCategory`)
  - Hierarchical tree structure (Level 1 → 2 → 3)
  - Categories appear as "Parent > Child > Grandchild" format

- **Search Flow**:
  1. User enters keywords (e.g., "Women's dress")
  2. `classifyQuery()` identifies required concepts and gender
  3. CJ API returns products matching the keywords
  4. Two-phase matching: strict first, then relaxed for remaining slots
  5. Combined results sorted by relevance score

## Product Import Automation System
- **Smart Product Discovery** - Enhanced CJ catalog search with quality scoring, category filters, and batch saving
- **KSA Pricing Engine** - Complete pricing rules system with:
  - Category-based margins (configurable per category)
  - 15% VAT calculation (mandatory for Saudi Arabia)
  - 2.9% payment gateway fees
  - Minimum profit protection (default 35 SAR)
  - Smart rounding to psychological price points (49, 79, 99, 149, 199, 249, 299)
- **Review & Approval Queue** - Full product approval workflow with bulk actions, CSV export, and reject functionality
- **Import Execution** - Automated product import with SKU generation, variant handling, and duplicate detection
- **Daily Sync System** - Automated price/stock monitoring with auto-apply:
  - Recalculates retail prices when supplier costs change
  - Applies 5-unit safety buffer on stock levels
  - Auto-hides products when stock reaches 0
  - Full audit logging for all changes
- **Inventory Management** - Real-time stock sync with CJ Dropshipping, low stock alerts, and visibility controls
- **Arabic/RTL Admin UI** - Full bilingual interface with language toggle:
  - i18n translations system in `src/lib/i18n/`
  - RTL layout support for Arabic
  - Navigation, labels, and UI elements in both languages

## Previous Changes
- **Migrated from Vercel to Replit** - Configured ports, environment variables, and workflows
- **Fixed LSP/TypeScript errors** - Resolved server action type export issue in cart-actions.ts
- **Improved admin security** - Admin guard now requires explicit ADMIN_EMAILS config in production
- **Added database migrations** - Created missing migrations for orders, product_variants, addresses, and reviews tables
- **Removed deprecated code** - Cleaned up duplicate webhook routes and empty files
- **Re-enabled Sentry instrumentation** - Works with optional SENTRY_DSN configuration
- **Supplier Management System** - Replaced "CJ" branding with generic "Supplier" terminology throughout admin
- **Fixed Product Import** - Import route now uses correct database schema
- **Added graceful degradation for missing tables** - Admin pages detect missing database tables and show setup instructions

---

# User Preferences

Preferred communication style: Simple, everyday language.

---

# System Architecture

## Frontend Architecture

**Framework:** Next.js 14 with App Router and TypeScript  
**Styling:** Tailwind CSS with custom design tokens for the Shopixo brand (gold/navy palette, HSL color system)  
**UI Components:** Radix UI primitives (dropdowns, labels, radio groups, selects) styled with shadcn/ui patterns and class-variance-authority  
**Theme Support:** Dark/light mode toggle via next-themes  
**Internationalization:** RTL-first design for Arabic with English fallbacks; layout direction managed via CSS and HTML `dir` attribute  
**Icons:** Lucide React for consistent iconography  

**Rationale:** Next.js App Router provides server-side rendering, streaming, and automatic code splitting. Tailwind enables rapid UI development with design consistency. Radix UI ensures accessibility compliance out of the box.

## Backend Architecture

**Runtime:** Next.js API routes and Server Components (React Server Components)  
**Database:** Supabase (PostgreSQL with Row Level Security policies)  
**Authentication:** Supabase Auth with auth-helpers-nextjs for session management  
**Payment Processing:** Stripe (checkout sessions, webhooks for order fulfillment)  
**Rate Limiting:** Upstash Redis with @upstash/ratelimit for API protection  
**Error Tracking:** Sentry (optional, conditionally loaded if SENTRY_DSN is set)  

**Data Flow:**
1. Server Components fetch data directly from Supabase using service role keys (no client-side exposure)
2. Server Actions handle mutations (cart operations, order creation)
3. Webhooks (Stripe, CJ) trigger backend processes for order fulfillment and inventory updates
4. Rate limiting middleware protects sensitive endpoints

**Rationale:** Supabase provides a managed PostgreSQL backend with built-in auth and real-time capabilities. Server Components reduce client-side JavaScript and improve performance. Stripe webhooks ensure payment verification happens server-side for security.

## Data Storage

**Primary Database:** Supabase (PostgreSQL)  
**Schema Highlights:**
- `products`: Product catalog with fields for title, description, price, images, variants, stock, and active status
- `cart_sessions` / `cart_items`: Server-side cart state (cookie-based session ID)
- `orders` / `order_items`: Order history with status tracking
- `blog_posts`: Optional CMS for blog content (admin CRUD)
- RPC function `decrement_stock`: Atomic inventory management (security definer)

**Row Level Security (RLS):**
- Products: Public read, service role write
- Cart: Service role only (prevents client tampering)
- Orders: Service role write, users can read their own orders

**Rationale:** Server-side cart prevents client-side manipulation. RLS policies enforce least-privilege access. Atomic RPC functions prevent race conditions in stock management.

## Authentication & Authorization

**Provider:** Supabase Auth  
**Session Management:** Server-side cookies via @supabase/auth-helpers-nextjs  
**Protected Routes:** Middleware redirects unauthenticated users from `/account/*`, `/admin/*`  
**Admin Access:** Role-based checks in Server Components (future: custom claims or admin table)  

**Rationale:** Supabase Auth handles OAuth, magic links, and password auth. Server-side session management improves security over client-only JWT storage.

## Security Architecture

**Content Security Policy (CSP):** Middleware generates per-request nonces for inline scripts; strict CSP blocks unsafe-inline/unsafe-eval  
**Allowed Domains:** Stripe, Supabase, Cloudinary, Plausible, Sentry, OpenAI  
**Rate Limiting:** Upstash Redis enforces request quotas on API routes  
**HTTPS-Only:** Production deployment via Vercel with automatic SSL  
**Environment Secrets:** Sensitive keys (service role, Stripe secret, webhook secrets) stored in Vercel environment variables  

**Rationale:** CSP mitigates XSS attacks. Rate limiting prevents abuse. Nonce-based script execution allows dynamic content while blocking malicious injections.

## Testing Strategy

**Unit Tests:** Jest + React Testing Library for components  
**E2E Tests:** Playwright for critical user flows (checkout, theme toggle, navigation)  
**Mocks:** Next.js components (Link, Image) and Radix UI portals mocked for jsdom compatibility  
**CI/CD:** Tests run on push; production smoke tests validate live deployments  

**Rationale:** Unit tests catch regressions early. E2E tests validate real-world scenarios. Mocking simplifies test setup without sacrificing coverage.

---

# External Dependencies

## Third-Party Services

**Supabase:**
- Purpose: Database, auth, real-time subscriptions
- Integration: Server-side client (`@supabase/supabase-js`) with service role key for admin operations, anon key for public reads
- Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Stripe:**
- Purpose: Payment processing (cards, Apple Pay), webhook-based order confirmation
- Integration: `@stripe/stripe-js` (client), `stripe` Node SDK (server), checkout sessions + webhooks
- Environment Variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Webhook Endpoint: `/api/stripe/webhook` (validates signature, creates orders on successful payment)

**CJ Dropshipping:**
- Purpose: Product sourcing, fulfillment, shipping calculation
- Integration: Custom API client in `src/lib/cj/`, batch product sync, webhook for tracking updates
- Environment Variables: `CJ_API_BASE`, `CJ_API_KEY` or `CJ_ACCESS_TOKEN`, `CJ_EMAIL`, `CJ_WEBHOOK_SECRET`
- Admin Pages: `/admin/cj/*` for catalog refresh, product sync, shipping calculator

**Upstash Redis:**
- Purpose: Rate limiting for API routes
- Integration: `@upstash/ratelimit` + `@upstash/redis`
- Environment Variables: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

**Sentry (Optional):**
- Purpose: Error tracking and performance monitoring
- Integration: Conditionally loaded if `SENTRY_DSN` is set (graceful degradation if package missing)
- Environment Variable: `SENTRY_DSN`

**OpenAI (Optional):**
- Purpose: AI-powered chat widget for customer support
- Integration: `/api/chat` endpoint uses OpenAI API for conversational responses
- Environment Variables: `OPENAI_API_KEY`, `AI_MODEL_TEXT`

## Payment Gateways (KSA Focus)

**Primary:** Stripe (cards, Apple Pay)  
**Alternative Options (Documented):** Tap Payments, Moyasar (for KSA market; documentation in `ops/payments/`)  
**Future:** COD (Cash on Delivery) support via logistics partners

## Deployment & Hosting

**Platform:** Vercel (optimized for Next.js)  
**Build Command:** `npm run build`  
**Environment:** Production (`VERCEL_ENV=production`), preview branches auto-deploy  
**Domain:** Configured via `NEXT_PUBLIC_SITE_URL`  
**Static Assets:** Served from `/public`, includes brand assets, favicons, PWA icons

## Analytics & Monitoring

**Plausible Analytics (Optional):** Privacy-friendly analytics (script loaded via CSP-allowed domain)  
**Sentry:** Application monitoring and error reporting (optional)  

## Development Tools

**Linting:** ESLint with Next.js and TypeScript rules  
**Testing:** Jest (unit), Playwright (E2E), GitHub Actions for CI  
**Icon Generation:** Custom script (`scripts/brand-kit/generate-icons.mjs`) generates favicons and PWA icons from SVG/PNG source  
**Category Management:** Scripts in `scripts/categories/` for downloading/validating category images

---