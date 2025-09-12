import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

// Initialize client without hard-requiring env at build time.
// createPagesBrowserClient reads NEXT_PUBLIC_* at runtime in the browser.
export const supabase = createPagesBrowserClient();
