import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Centralized DB feature detection with simple in-memory caching.
// - hasTable(table)
// - hasColumn(table, column)
// - hasColumns(table, [columns])
// The checks are optimistic on failures (assume feature exists) to avoid breaking runtime paths.

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

type ColumnCache = Map<string, boolean>;

const tableCache = new Map<string, boolean>();
const columnCache = new Map<string, ColumnCache>();

export function clearDbFeatureCache() {
  tableCache.clear();
  columnCache.clear();
}

export async function hasTable(table: string): Promise<boolean> {
  const cached = tableCache.get(table);
  if (typeof cached === 'boolean') return cached;
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    // If service role is not configured, assume table exists (non-breaking default)
    tableCache.set(table, true);
    return true;
  }
  try {
    const { error } = await supabase.from(table).select('*').limit(0);
    if (error) {
      const msg = String((error as any)?.message || error);
      if (/does not exist|relation .* does not exist/i.test(msg)) {
        tableCache.set(table, false);
        return false;
      }
      // Other errors (e.g., network): assume exists to avoid hard failures
    }
    tableCache.set(table, true);
    return true;
  } catch {
    tableCache.set(table, true);
    return true;
  }
}

export async function hasColumn(table: string, column: string): Promise<boolean> {
  let tCache = columnCache.get(table);
  if (!tCache) {
    tCache = new Map<string, boolean>();
    columnCache.set(table, tCache);
  }
  const cached = tCache.get(column);
  if (typeof cached === 'boolean') return cached;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    tCache.set(column, true);
    return true;
  }
  try {
    const { error } = await supabase.from(table).select(column).limit(0);
    if (error) {
      const msg = String((error as any)?.message || error);
      if (/column .* does not exist|does not exist/i.test(msg)) {
        tCache.set(column, false);
        return false;
      }
      // Other errors -> optimistic true
    }
    tCache.set(column, true);
    return true;
  } catch {
    tCache.set(column, true);
    return true;
  }
}

export async function hasColumns(table: string, columns: string[]): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  const pairs = await Promise.all(columns.map(async (c) => [c, await hasColumn(table, c)] as const));
  for (const [c, ok] of pairs) result[c] = ok;
  return result;
}
