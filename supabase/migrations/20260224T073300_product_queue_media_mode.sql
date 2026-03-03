-- Compatibility patch for import queue writes that include media_mode.
-- Safe to run multiple times.
ALTER TABLE IF EXISTS public.product_queue
ADD COLUMN IF NOT EXISTS media_mode TEXT;
