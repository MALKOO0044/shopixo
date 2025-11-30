# Overview

Shopixo is a modern e-commerce platform designed for the Saudi Arabian market. It features a bilingual interface (Arabic/English RTL support), secure checkout, fast delivery, and a curated shopping experience across various product categories. The platform aims to provide a professional and efficient online shopping experience, leveraging modern web technologies and robust integrations.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework:** Next.js 14 (App Router) with TypeScript.
**Styling:** Tailwind CSS with custom design tokens (gold/navy palette, HSL color system) and shadcn/ui patterns.
**UI Components:** Radix UI primitives for accessibility.
**Theme Support:** Dark/light mode via `next-themes`.
**Internationalization:** RTL-first design for Arabic with English fallbacks, managed via CSS and HTML `dir` attribute.
**Icons:** Lucide React.

## Backend Architecture

**Runtime:** Next.js API routes and Server Components.
**Database:** Supabase (PostgreSQL with Row Level Security).
**Authentication:** Supabase Auth with `auth-helpers-nextjs`.
**Payment Processing:** Stripe (checkout sessions, webhooks).
**Rate Limiting:** Upstash Redis with `@upstash/ratelimit`.
**Error Tracking:** Sentry (optional).

**Data Flow:** Server Components fetch data directly from Supabase. Server Actions handle mutations. Webhooks (Stripe, CJ) trigger backend processes. Rate limiting protects API endpoints.

## Data Storage

**Primary Database:** Supabase (PostgreSQL).
**Schema Highlights:** `products`, `cart_sessions`, `cart_items`, `orders`, `order_items`, `blog_posts`. Includes an RPC function `decrement_stock` for atomic inventory management.
**Row Level Security (RLS):** Implemented for products, cart, and orders to ensure data access control.

## Authentication & Authorization

**Provider:** Supabase Auth for session management via server-side cookies.
**Protected Routes:** Middleware secures user account and admin routes.
**Admin Access:** Role-based checks in Server Components.

## Security Architecture

**Content Security Policy (CSP):** Middleware generates per-request nonces for inline scripts, blocking unsafe execution.
**Allowed Domains:** Stripe, Supabase, Cloudinary, Plausible, Sentry, OpenAI.
**Rate Limiting:** Upstash Redis for API protection.
**HTTPS-Only:** Production deployment via Vercel with automatic SSL.
**Environment Secrets:** Stored in Vercel environment variables.

## Testing Strategy

**Unit Tests:** Jest + React Testing Library for components.
**E2E Tests:** Playwright for critical user flows.
**CI/CD:** Tests run on push, production smoke tests for live deployments.

## Core Features

**Category-Based Product Discovery:** Replaced keyword search with category and multi-select feature dropdowns, fetching products directly by CJ category IDs for precise results. Supports hierarchical categories and multi-selection of features.
**Product Import Automation:** Includes smart product discovery with quality scoring, KSA pricing engine (VAT, fees, profit protection, smart rounding), review and approval queue, automated import execution, and daily sync for price/stock monitoring.
**Product Discovery Search System:** Employs a keyword lexicon module for concept identification, CJ categories integration, and a two-phase matching search flow (strict then relaxed) with relevance scoring.

# External Dependencies

**Supabase:** Database, authentication, real-time subscriptions.
**Stripe:** Payment processing, webhooks.
**CJ Dropshipping:** Product sourcing, fulfillment, shipping calculation. Integrated via custom API client for product sync and webhook for tracking updates.
**Upstash Redis:** Rate limiting for API routes.
**Sentry (Optional):** Error tracking and performance monitoring.
**OpenAI (Optional):** AI-powered chat widget for customer support.

**Payment Gateways (KSA Focus):** Stripe (primary). Documentation for Tap Payments and Moyasar is available.
**Deployment & Hosting:** Vercel.
**Analytics & Monitoring:** Plausible Analytics (optional), Sentry (optional).