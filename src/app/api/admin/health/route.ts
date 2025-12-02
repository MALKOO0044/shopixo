import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/cj/v2';
import { getSupabaseAnonServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type ServiceStatus = 'ok' | 'error' | 'unknown';

interface HealthCheckResult {
  service: string;
  status: ServiceStatus;
  message: string;
  latencyMs?: number;
}

async function checkCJApi(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const token = await getAccessToken();
    const latency = Date.now() - start;
    
    if (token) {
      return {
        service: 'CJ Dropshipping API',
        status: 'ok',
        message: 'Connected and authenticated',
        latencyMs: latency,
      };
    } else {
      return {
        service: 'CJ Dropshipping API',
        status: 'error',
        message: 'Failed to get access token',
        latencyMs: latency,
      };
    }
  } catch (e: any) {
    return {
      service: 'CJ Dropshipping API',
      status: 'error',
      message: e?.message || 'Connection failed',
      latencyMs: Date.now() - start,
    };
  }
}

async function checkDatabase(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const supabase = getSupabaseAnonServer();
    if (!supabase) {
      return {
        service: 'Database',
        status: 'error',
        message: 'Supabase not configured',
      };
    }
    
    const { error } = await supabase.from('kv_settings').select('key').limit(1);
    const latency = Date.now() - start;
    
    if (error) {
      return {
        service: 'Database',
        status: 'error',
        message: error.message,
        latencyMs: latency,
      };
    }
    
    return {
      service: 'Database',
      status: 'ok',
      message: 'Connected',
      latencyMs: latency,
    };
  } catch (e: any) {
    return {
      service: 'Database',
      status: 'error',
      message: e?.message || 'Connection failed',
      latencyMs: Date.now() - start,
    };
  }
}

async function checkStripe(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeKey) {
      return {
        service: 'Stripe Payments',
        status: 'unknown',
        message: 'API key not configured',
      };
    }
    
    return {
      service: 'Stripe Payments',
      status: 'ok',
      message: 'API key configured',
      latencyMs: Date.now() - start,
    };
  } catch (e: any) {
    return {
      service: 'Stripe Payments',
      status: 'error',
      message: e?.message || 'Check failed',
      latencyMs: Date.now() - start,
    };
  }
}

export async function GET() {
  try {
    const [cjResult, dbResult, stripeResult] = await Promise.all([
      checkCJApi(),
      checkDatabase(),
      checkStripe(),
    ]);
    
    const allServices = [cjResult, dbResult, stripeResult];
    const overallStatus = allServices.every(s => s.status === 'ok') ? 'ok' :
                         allServices.some(s => s.status === 'error') ? 'error' : 'unknown';
    
    return NextResponse.json({
      ok: true,
      status: overallStatus,
      services: allServices,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      status: 'error',
      error: e?.message || 'Health check failed',
    }, { status: 500 });
  }
}
