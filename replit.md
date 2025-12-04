# Overview

Shopixo is a modern e-commerce platform tailored for the Saudi Arabian market, offering a bilingual (Arabic/English RTL) interface, secure transactions, and efficient delivery. The platform focuses on a curated shopping experience across diverse product categories, aiming to deliver a professional online retail service using modern web technologies and robust integrations. Its core ambition is to provide a comprehensive and user-friendly e-commerce solution with strong product discovery, automated import processes, and reliable order fulfillment.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
**Framework:** Next.js 14 (App Router) with TypeScript.
**Styling:** Tailwind CSS with a gold/navy HSL color palette, custom design tokens, and shadcn/ui.
**UI/UX:** Radix UI primitives for accessibility, dark/light mode via `next-themes`, and RTL-first design for Arabic.
**Icons:** Lucide React.

## Backend
**Runtime:** Next.js API routes and Server Components.
**Database:** Supabase (PostgreSQL with Row Level Security).
**Authentication:** Supabase Auth (`auth-helpers-nextjs`).
**Payment Processing:** Stripe (checkout sessions, webhooks).
**Rate Limiting:** Upstash Redis (`@upstash/ratelimit`).
**Error Tracking:** Sentry (optional).
**Data Flow:** Server Components handle data fetching, Server Actions manage mutations. Webhooks drive backend processes.

## Data Storage
**Primary:** Supabase (PostgreSQL) with schemas for products, cart, orders, and blog posts. Includes an RPC function for atomic inventory updates.
**Security:** Row Level Security (RLS) is implemented for data access control.

## Authentication & Authorization
**Provider:** Supabase Auth for server-side cookie-based session management.
**Access Control:** Middleware protects routes, and Server Components enforce role-based authorization for admin functionalities.

## Security
**CSP:** Per-request nonces for inline scripts.
**Allowed Domains:** Stripe, Supabase, Cloudinary, Plausible, Sentry, OpenAI.
**Protection:** Upstash Redis for API rate limiting, HTTPS-only deployment via Vercel, and environment variables for secrets.

## Testing
**Unit:** Jest + React Testing Library.
**E2E:** Playwright for critical user flows.
**CI/CD:** Automated tests on push, production smoke tests for deployments.

## Core Features
**Product Discovery:** Category and multi-select feature dropdowns replace keyword search, leveraging CJ category IDs for precise results with hierarchical and multi-selection support.
**Product Import Automation:** Includes smart product discovery with quality scoring, a KSA-specific pricing engine (VAT, fees, profit protection, smart rounding), an approval queue, automated import, and daily price/stock sync.
**Search System:** Utilizes a keyword lexicon, CJ categories, and a two-phase (strict then relaxed) matching search with relevance scoring.
**Per-Variant Pricing:** Ensures 100% accurate SAR pricing per variant, keyed by `variantId` to prevent mismatches. Includes variant-specific shipping and pricing properties.
**Unified Search+Price Flow:** Single-step product discovery where user sets profit margin before search, then backend orchestrates: search products → resolve variant IDs → calculate shipping (rate-limited) → apply profit margin → return products with final SAR prices. Products only display when ALL pricing is complete - no progressive price updates.
**CJ API Integration Notes:**
- CJ product list/search API returns variant SKUs (e.g., "CJNSFSW301136") not actual variant IDs (e.g., "1796078021431009280")
- The freight calculate API requires the actual `vid` (numeric/UUID format), not the SKU
- The `/api/admin/cj/products/search-and-price` endpoint handles the complete flow: search → vid resolution → freight calculation → pricing
- Rate limiting: 1.2 seconds between CJ freight API calls to comply with CJ API limits
- If vid lookup fails, variant is marked as unavailable (no fallbacks to preserve accuracy)
**Variant Resolution (Two-Tier Approach):**
- PRIMARY: `/product/query` endpoint works for ALL products and returns variants with vids directly
- FALLBACK: Two-phase caching (add to "My Products" → query variants → cache in DB) used only when primary fails
- Database cache table `cj_variant_cache` stores (pid, vid, sku, price, weight)
- SKU matching: Build lookup map by SKU for correct vid→variant mapping
- Migration: `supabase/migrations/20251203_cj_variant_cache.sql`
**Blocking Flow (Success-Only):**
- Products only returned when AT LEAST ONE variant is successfully priced
- Only successfully priced variants are included in response (failed variants are removed)
- Products with ZERO successful variants are excluded
- Timeout triggers HTTP 408 failure (not partial results)
- No progressive price updates - complete pricing or no display
**Error Detection System:** A global `ErrorProvider` ensures all errors are visible by default via toast notifications, with an optional "silent" mode for admin users (errors are always logged to the database). Includes server-side error logging, a health check API for external services (CJ, DB, Stripe), and an admin dashboard for error monitoring and system health status.

# External Dependencies

**Supabase:** Database, authentication, real-time features.
**Stripe:** Payment gateway.
**CJ Dropshipping:** Product sourcing, fulfillment, and shipping (integrated via custom API client and webhooks).
**Upstash Redis:** API rate limiting.
**Sentry (Optional):** Error tracking and performance.
**OpenAI (Optional):** AI-powered customer support chat.
**Payment Gateways:** Stripe (primary), with documentation for Tap Payments and Moyasar.
**Deployment & Hosting:** Vercel.
**Analytics & Monitoring:** Plausible Analytics (optional), Sentry (optional).