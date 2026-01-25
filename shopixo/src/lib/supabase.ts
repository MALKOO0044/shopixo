"use client";

import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

// Lazily initialize client on first use to avoid touching env at module import time.
let _client: ReturnType<typeof createPagesBrowserClient> | null = null;
export function getSupabaseBrowser() {
  if (!_client) {
    _client = createPagesBrowserClient();
  }
  return _client;
}
