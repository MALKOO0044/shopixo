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

# Recent Changes

## Per-Variant Pricing Architecture (Dec 1, 2025)

**Critical Mandate:** Zero tolerance for pricing errors - each variant must have 100% accurate SAR pricing.

**Architecture:**
- Pricing is stored and keyed by `variantId` (never by array index) to prevent mismatch when variant arrays reorder
- Each variant has its own `shipping` and `pricing` properties
- UI uses `selectedVariantId` map to track which variant is being viewed per product
- All state updates use `variant.vid` matching, never positional indices

**Implementation:**
1. Shipping API (`src/app/api/admin/cj/shipping/calculate/route.ts`):
   - Accepts per-variant inputs: `{productId, variantId, variantPriceUSD}[]`
   - Returns results keyed by `variantId`: `{[variantId]: {shipping, pricing}}`
   - Uses CJPacket Ordinary shipping method only (China to Saudi Arabia)

2. Product Discovery UI (`src/app/admin/import/discover/page.tsx`):
   - Variant selector allows clicking to view different variants
   - "Calculate SAR Pricing" button triggers on-demand pricing for selected variant
   - Pricing display shows: CJ Price, Shipping, Your Cost, Profit, Sell Price
   - Profit margin adjustment recalculates locally without re-calling CJ API

3. Type Extensions (`CjVariant` type):
   - `shipping?: { available: boolean; costUSD?: number; costSAR?: number; ... }`
   - `pricing?: { variantPriceSAR: number; shippingSAR: number; sellPriceSAR: number; profitSAR: number }`

**Pricing Formula:**
- USD to SAR rate: 3.75 (fixed)
- Sell Price = (Variant Price + Shipping) × (1 + Profit Margin %)
- Variants without CJPacket Ordinary shipping show "Shipping unavailable"

**Key Files:**
- `src/lib/cj/v2.ts` - CJ API client with `calculateShippingToSA()` and `calculateFinalPricingSAR()`
- `src/app/api/admin/cj/shipping/calculate/route.ts` - Per-variant shipping/pricing API
- `src/app/admin/import/discover/page.tsx` - Product Discovery with variant selector and pricing display

## CJ API Product Search Fix (Nov 30, 2025)

**Issue:** Product search was returning empty results because the CJ API response validation was missing.

**Root Cause:** The `fetchCjProductPage` function in `src/app/api/admin/cj/products/query/route.ts` was not checking if the CJ API response was successful (checking for `code === 200` and `result === true`). When the API returned an error, the function silently returned empty results.

**Fixes Applied:**
1. `src/app/api/admin/cj/products/query/route.ts` - Added proper CJ API response validation and logging to `fetchCjProductPage` function
2. `src/lib/cj/v2.ts` - Added logging and response validation to:
   - `listCjProductsPage` function
   - `queryProductByPidOrKeyword` function  
   - `getAccessToken` function (for authentication flow tracking)

**Key Files:**
- `src/lib/cj/v2.ts` - CJ API client with token authentication
- `src/app/api/admin/cj/products/query/route.ts` - Product search endpoint
- `src/lib/cj/rate-limit.ts` - CJ API rate limiting (1.1s between requests)
- `src/lib/integration/token-store.ts` - Token persistence in database

## Comprehensive Error Detection System (Dec 2, 2025)

**Critical Mandate:** All errors must be visible by default. Silent mode is an optional toggle for admin users.

**Architecture:**
- Global `ErrorProvider` wraps the entire app and respects notification mode settings
- Notification mode defaults to "visible" (shows toast notifications for all errors)
- Admin can toggle to "silent" mode to suppress UI notifications while still logging
- All errors are logged to database regardless of notification mode

**Implementation:**

1. Error Logging (`src/lib/error-logger.ts`):
   - Server-side utility for persistent error storage
   - Supports error types: `cj_api`, `search`, `shipping`, `pricing`, `database`, `auth`, `payment`, `general`
   - Captures: error_type, message, stack, page, user_email, details, timestamp

2. Error Provider (`src/components/error-provider.tsx`):
   - Global context that wraps the entire app
   - Fetches notification mode from admin settings on mount
   - Provides `showError`, `showWarning`, `showSuccess` functions
   - Respects silent mode for error notifications while always logging

3. Health Check API (`src/app/api/admin/health/route.ts`):
   - Monitors CJ Dropshipping API connectivity
   - Monitors database connectivity
   - Monitors Stripe configuration
   - Returns status for each service with latency metrics

4. Admin Error Dashboard (`src/app/admin/errors/page.tsx`):
   - Displays system health status for all services
   - Shows recent errors with filtering by type
   - Toggle between visible/silent notification modes
   - Real-time refresh capability

5. Admin Navigation Health Indicator (`src/app/admin/AdminLayoutClient.tsx`):
   - Green dot: All systems operational
   - Yellow dot (pulsing): Checking status
   - Red dot: System issues detected
   - Auto-refreshes every 60 seconds

**Key Files:**
- `src/lib/error-logger.ts` - Server-side error logging utility
- `src/components/error-provider.tsx` - Global error context provider
- `src/app/api/admin/errors/route.ts` - Error fetching and settings API
- `src/app/api/admin/errors/log/route.ts` - Client-side error logging endpoint
- `src/app/api/admin/health/route.ts` - System health check API
- `src/app/admin/errors/page.tsx` - Admin error dashboard
- `src/app/admin/AdminLayoutClient.tsx` - Admin navigation with health indicator

## CJ API Key Update (Dec 2, 2025)

**API Key Format:** `CJ{UserNum}@api@{32-character-hex}`

**Configuration:**
- API key stored as secret: `CJ_API_KEY`
- Email: `malk.t1287@gmail.com` (original account restored)
- API Base: `https://developers.cjdropshipping.com/api2.0/v1`

**Token Management:**
- Tokens stored in Supabase `integration_tokens` table
- Access tokens valid for 15 days
- Refresh tokens valid for 180 days
- In-memory caching with `clearTokenCache()` function for forced refresh
- Clear token endpoint: `POST /api/admin/cj/clear-token`

**Key Files:**
- `src/lib/cj/v2.ts` - CJ API client with token authentication
- `src/lib/integration/token-store.ts` - Token persistence in Supabase
- `src/app/api/admin/cj/clear-token/route.ts` - Token cache clear endpoint

## CJ Category Hierarchy Fix (Dec 2, 2025)

**Issue:** Product search was returning zero results when selecting features in Product Discovery.

**Root Cause:** CJ categories have a 3-level hierarchy:
- **Level 1 (categoryFirstId):** Top-level category (e.g., "Women's Clothing")
- **Level 2 (categorySecondId):** Feature grouping (e.g., "Accessories") - NOT valid for product search
- **Level 3 (categoryId):** Actual product category (e.g., "Scarves & Wraps") - VALID for product search

The frontend was sending Level 2 IDs directly to the CJ product search API, but Level 2 IDs are only groupings and always return 0 products.

**Fix Applied:**
1. Categories API (`src/app/api/admin/cj/categories/route.ts`):
   - Added `isProductCategory: boolean` flag to each feature
   - Level 3 features have `isProductCategory: true`
   - Level 2 features have `isProductCategory: false` and include `childCategoryIds` array with all valid Level 3 children

2. Frontend (`src/app/admin/import/discover/page.tsx`):
   - `searchProducts()` now expands Level 2 selections to their child Level 3 category IDs
   - Deduplicates category IDs before API call
   - Shows error if no valid product categories are selected

**Type Updates:**
```typescript
type Feature = {
  featureId: string;
  featureName: string;
  level: number;
  parentId?: string;
  isProductCategory?: boolean; // true = valid for product search
  childCategoryIds?: string[]; // Level 2 includes Level 3 children
};
```

**Key Files:**
- `src/app/api/admin/cj/categories/route.ts` - Categories endpoint with hierarchy metadata
- `src/app/admin/import/discover/page.tsx` - Frontend with category expansion logic

## CJ Product List API Method Fix (Dec 3, 2025)

**Issue:** Product search was still returning zero results even after the category hierarchy fix was applied.

**Root Cause:** The CJ API `/product/list` endpoint only accepts **GET** requests with query parameters, but the code was using **POST** with a JSON body for category-based searches.

**CJ API Response:**
```
code: 16900202
message: "Request method 'POST' not supported"
```

**Fix Applied:**
Changed `fetchCjProductsByCategoryId()` in `src/app/api/admin/cj/products/query/route.ts` from:
```typescript
// WRONG - POST with body
const res = await fetch(`${base}/product/list`, {
  method: 'POST',
  body: JSON.stringify({ categoryId, pageNum, pageSize }),
});
```
To:
```typescript
// CORRECT - GET with query parameters
const params = new URLSearchParams();
params.set('categoryId', categoryId);
params.set('pageNum', String(pageNum));
params.set('pageSize', String(pageSize));

const res = await fetch(`${base}/product/list?${params}`, {
  method: 'GET',
});
```

**Verification:**
- Tested with Level 3 category ID `0DC4DF6F-4EC5-47DF-B20D-863ADF69319F` (Scarves & Wraps)
- GET request returns products correctly
- POST request returns error code `16900202`

**Key Files:**
- `src/app/api/admin/cj/products/query/route.ts` - Product query endpoint with fixed HTTP method