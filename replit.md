# Overview

LightInTheBox US is a modern e-commerce platform replica designed for the USA market. It provides an English-only shopping experience with USD currency, featuring animated search bars, auto-rotating banners, flash sale countdown timers, and fully interconnected product components.

# Recent Changes (December 2025)

## LightInTheBox Homepage Replica (December 21, 2025)
- **Change**: Transformed Shopixo e-commerce store into exact replica of LightInTheBox for US market
- **Scope**: Complete redesign with new red/white color theme and component structure
- **Components Created**:
  - `src/components/litb/LitbHeader.tsx` - Main header with logo, animated search, cart, account
  - `src/components/litb/AnimatedSearchBar.tsx` - Search bar with cycling placeholder text every 3 seconds
  - `src/components/litb/LitbNavBar.tsx` - Horizontal navigation with LightInTheBox categories
  - `src/components/litb/HeroBanners.tsx` - 3-column hero grid with auto-rotating slideshow
  - `src/components/litb/CategoryCircles.tsx` - Two rows of circular category icons
  - `src/components/litb/FlashSale.tsx` - Flash sale section with live countdown timer
  - `src/components/litb/ProductCarousel.tsx` - Reusable horizontal product carousel
  - `src/components/litb/PromoBanners.tsx` - Three promotional banner grid
  - `src/components/litb/CategoryShowcase.tsx` - Large lifestyle category images
  - `src/components/litb/RecommendedProducts.tsx` - Product grid with SALE badges
  - `src/components/litb/FixedSidebar.tsx` - Right-side fixed sidebar (Cart, App, Support)
  - `src/components/litb/LitbFooter.tsx` - Footer with links and app download
- **Features**:
  - Animated search bar cycles through placeholders: Women's Dresses, Men's Jackets, Running Shoes, etc.
  - Hero section with 3-column layout: left sidebar banners, center auto-rotating slideshow, right promo card
  - Flash Sale with live countdown timer (hours:minutes:seconds)
  - All prices in USD ($)
  - Red (#e31e24) primary brand color
  - Fixed right sidebar with quick access buttons
  - Horizontal scrolling product carousels with hover effects

## Previous: Full Localization to USA Market (December 16, 2025)
- Converted platform from Saudi Arabia market (Arabic/RTL/SAR) to USA market (English/LTR/USD)
- Complete translation of 150+ files

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
Next.js 14 (App Router) with TypeScript for server-side rendering. Styling with Tailwind CSS using red/white color scheme matching LightInTheBox branding. UI components built with custom components and Lucide React icons.

## Component Structure
All LightInTheBox replica components are in `src/components/litb/`:
- Header components: LitbHeader, AnimatedSearchBar, LitbNavBar
- Homepage sections: HeroBanners, CategoryCircles, FlashSale
- Product display: ProductCarousel, RecommendedProducts
- Promotional: PromoBanners, CategoryShowcase
- Navigation: FixedSidebar, LitbFooter

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
