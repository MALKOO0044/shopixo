# CJ Admin Guide

This guide explains how to operate the CJ integration in your store.

## Prerequisites
- Set the following environment variables in Vercel with exact names:
  - CJ_API_KEY (or CJ_ACCESS_TOKEN)
  - CJ_API_BASE
  - CJ_EMAIL
  - CJ_WEBHOOK_SECRET
  - NEXT_PUBLIC_SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
  - OPENAI_API_KEY (optional)
  - AI_MODEL_TEXT (optional)
- Redeploy the app after saving the variables.

## Admin pages
- Hub: /admin/cj
- Catalog refresh: /admin/cj/refresh
- Shipping calculator: /admin/cj/shipping
- Product detail (raw + mapped + actions): /admin/cj/product/[pid]

## Catalog refresh (batch)
1) Open /admin/cj/refresh.
2) Set `pageNum` and `pageSize` (20–50 recommended), optionally a keyword.
3) Keep toggles ON for Update Images/Video/Price.
4) Click "Run Batch". Repeat with next pageNum until done.

## Re-sync a single product
1) On /admin/cj/refresh, use the second form.
2) Paste the CJ PID (GUID). Keep all toggles ON.
3) Submit. The product is upserted, images filtered, video saved, variants refreshed.

## Product inspector
- Go to /admin/cj/product/[pid].
  - Left: mapped data, images, variants summary.
  - Right: raw CJ JSON for auditing.
  - Actions: Force re-sync (images + video + price), Shipping preview.

## Shipping calculator
- Use /admin/cj/shipping to test `freightCalculate` by country, PID/SKU, and quantity.
- Use results to verify delivery time windows and carrier pricing.

## Webhook
- Endpoint: /api/cj/webhook
- Secure with CJ_WEBHOOK_SECRET (HMAC-SHA256). Use header `x-cj-signature`.
- Purpose: keep tracking / shipping updates in sync.

## Notes
- Prices are computed as: cost + cheapest shipping + margin, then rounded, with a price floor.
- Image filtering removes badges, logos, flags, size charts, and small thumbnails.
- All API calls include timeouts, retries, and request correlation via `x-request-id`.
