import { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;
let lastPoolError: string | null = null;

export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('[DB] DATABASE_URL environment variable is not set');
    throw new Error('Database connection not available. Please ensure DATABASE_URL is configured.');
  }
  
  if (!pool) {
    console.log('[DB] Creating new connection pool...');
    const sslRequired = connectionString.includes('sslmode=require') || 
                        connectionString.includes('.supabase.co') ||
                        connectionString.includes('.neon.tech') ||
                        process.env.NODE_ENV === 'production';
    
    pool = new Pool({
      connectionString,
      ssl: sslRequired ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    });
    
    pool.on('error', (err) => {
      console.error('[DB] Unexpected database pool error:', err?.message || err);
      lastPoolError = err?.message || 'Unknown pool error';
      pool = null;
    });
    
    pool.on('connect', () => {
      console.log('[DB] New client connected to pool');
      lastPoolError = null;
    });
  }
  return pool;
}

export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

export function getLastPoolError(): string | null {
  return lastPoolError;
}

export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!isDatabaseConfigured()) {
      return { ok: false, error: 'DATABASE_URL not configured' };
    }
    const client = await getPool().connect();
    try {
      await client.query('SELECT 1');
      return { ok: true };
    } finally {
      client.release();
    }
  } catch (e: any) {
    console.error('[DB] Connection test failed:', e?.message);
    return { ok: false, error: e?.message || 'Connection failed' };
  }
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  let client: PoolClient | null = null;
  try {
    client = await getPool().connect();
    const result = await client.query(sql, params);
    return result.rows as T[];
  } catch (e: any) {
    console.error('[DB] Query error:', e?.message, 'SQL:', sql.slice(0, 100));
    throw e;
  } finally {
    if (client) client.release();
  }
}

export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] || null;
}

export async function execute(sql: string, params?: any[]): Promise<{ rowCount: number }> {
  let client: PoolClient | null = null;
  try {
    client = await getPool().connect();
    const result = await client.query(sql, params);
    return { rowCount: result.rowCount || 0 };
  } catch (e: any) {
    console.error('[DB] Execute error:', e?.message, 'SQL:', sql.slice(0, 100));
    throw e;
  } finally {
    if (client) client.release();
  }
}
