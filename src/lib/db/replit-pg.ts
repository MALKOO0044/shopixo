import { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set');
    throw new Error('Database connection not available. Please ensure DATABASE_URL is configured.');
  }
  
  if (!pool) {
    const sslRequired = connectionString.includes('sslmode=require') || 
                        connectionString.includes('.supabase.co') ||
                        process.env.NODE_ENV === 'production';
    
    pool = new Pool({
      connectionString,
      ssl: sslRequired ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    
    pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
      pool = null;
    });
  }
  return pool;
}

export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] || null;
}

export async function execute(sql: string, params?: any[]): Promise<{ rowCount: number }> {
  const client = await getPool().connect();
  try {
    const result = await client.query(sql, params);
    return { rowCount: result.rowCount || 0 };
  } finally {
    client.release();
  }
}
