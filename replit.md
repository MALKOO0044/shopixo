# Overview

Shopixo is a professional e-commerce platform for the global market. It provides an English shopping experience with USD currency, featuring animated search bars, auto-rotating banners, flash sale countdown timers, and real product data from the Supabase database.

# Recent Changes (December 2025)

## Smart Category System Integration (December 21, 2025)
- **Database Tables**: Created `categories` table (3-level hierarchy: main → group → leaf) and `product_categories` bridge table for many-to-many product-category relationships
- **Data Layer**: 
  - Seeded 14 main CJ categories with 85 level-2 subcategories (99 total)
  - Created `src/lib/recommendations.ts` for smart product recommendations using pg module
  - Created `/api/categories` endpoint using pg module to bypass Supabase PostgREST cache
- **Components Updated**:
  - `CategoryCircles.tsx` - Fetches real categories from database with fallback images
  - `LitbNavBar.tsx` - Hierarchical category dropdown showing all main categories with expandable subcategories
  - Category pages now use pg-based queries for product-category relationships
- **Import System**: Admin import automatically links products to correct category hierarchy
- **Note**: New tables (categories, product_categories) use pg module directly instead of Supabase client due to PostgREST schema cache limitations

## Real Product Data Integration (December 21, 2025)
- **Change**: Integrated real product data from Supabase database for all homepage sections
- **Data Layer**: Created `src/lib/homepage-products.ts` for server-side product fetching
- **Components Updated**:
  - `FlashSale.tsx` - Now displays 8 real flash sale products from database
  - `ProductCarousel.tsx` - Shows real New Arrivals (6) and Best Sellers (6)
  - `RecommendedProducts.tsx` - Displays 10 real recommended products
- **Product Sources**: CJ Dropshipping products with real images and pricing
- **Branding**: Replaced all LightInTheBox references with Shopixo

## Component Structure
All Shopixo components are in `src/components/litb/`:
- Header: LitbHeader, AnimatedSearchBar, LitbNavBar
- Homepage: HeroBanners, CategoryCircles, FlashSale
- Products: ProductCarousel, RecommendedProducts
- Promotional: PromoBanners, CategoryShowcase
- Navigation: FixedSidebar, LitbFooter

## Features
- Animated search bar cycles through placeholder text every 3 seconds
- Hero section with 3-column layout and auto-rotating slideshow
- Flash Sale with live countdown timer (hours:minutes:seconds)
- All prices in USD ($) with real product data
- Red (#e31e24) primary brand color
- Fixed right sidebar with Cart, App, Support buttons
- Horizontal scrolling product carousels with hover effects

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
Next.js 14 (App Router) with TypeScript for server-side rendering. Styling with Tailwind CSS using red/white color scheme. UI components built with custom components and Lucide React icons.

## Backend Architecture
Next.js API routes and React Server Components. Supabase (PostgreSQL with RLS) for database. Stripe for payments. Upstash Redis for rate limiting.

## Data Storage
Supabase (PostgreSQL) for all data including products, cart, orders.

## Authentication & Authorization
Supabase Auth with OAuth and magic links.

# External Dependencies

## Third-Party Services

**Supabase:**
- Purpose: Database, authentication
- Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Stripe:**
- Purpose: Payment processing
- Environment Variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**Upstash Redis:**
- Purpose: Rate limiting for API routes
- Environment Variables: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

## Deployment & Hosting
- Platform: Replit
- Build Command: `npm run build`
