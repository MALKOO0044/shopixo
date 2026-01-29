# Shopixo

Professional e-commerce starter built with Next.js 14, TypeScript, and Tailwind CSS.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Open http://localhost:3000 in your browser.

## Tech Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS

## Next Steps
- Add pages: Shop, Product, Cart, Checkout, Order Tracking, About, Contact, FAQ, Privacy, Returns, Terms, Blog.
- Integrate database (Prisma + PostgreSQL), auth, payments, SEO, analytics, and vendor features.

## Brand Kit Icons

Use the brand kit script to generate all favicons and PWA icons into `public/`.

Prerequisites:

- Place one of the following in `public/`:
  - `public/logo-icon.svg` (preferred, high quality), or
  - `public/logo-icon.png` (will be masked/rounded automatically)

Run the generator:

```bash
npm install  # installs dev deps: sharp, fs-extra, png-to-ico
npm run icons:generate
```

This will generate:

- `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`
- `apple-touch-icon.png`
- `android-chrome-192x192.png`, `android-chrome-256x256.png`, `android-chrome-384x384.png`, `android-chrome-512x512.png`
- `maskable-icon-512.png`

Script location: `scripts/brand-kit/generate-icons.mjs`
