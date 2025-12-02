"use server";

import { getSupabaseAnonServer } from "@/lib/supabase-server";

export type ErrorType = 
  | 'cj_api'
  | 'search'
  | 'shipping'
  | 'pricing'
  | 'database'
  | 'auth'
  | 'payment'
  | 'general';

export interface ErrorLogEntry {
  error_type: ErrorType;
  error_code?: string;
  message: string;
  details?: Record<string, any>;
  page?: string;
  user_email?: string;
}

export async function logError(entry: ErrorLogEntry): Promise<{ ok: boolean; id?: number }> {
  try {
    const supabase = getSupabaseAnonServer();
    if (!supabase) {
      console.error('[ErrorLogger] Supabase not configured');
      return { ok: false };
    }
    
    const { data, error } = await supabase
      .from('error_logs')
      .insert({
        error_type: entry.error_type,
        error_code: entry.error_code || null,
        message: entry.message,
        details: entry.details || {},
        page: entry.page || null,
        user_email: entry.user_email || null,
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('[ErrorLogger] Failed to log error:', error);
      return { ok: false };
    }
    
    return { ok: true, id: data?.id };
  } catch (e) {
    console.error('[ErrorLogger] Exception while logging:', e);
    return { ok: false };
  }
}

export async function getRecentErrors(limit: number = 50): Promise<any[]> {
  try {
    const supabase = getSupabaseAnonServer();
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('[ErrorLogger] Failed to fetch errors:', error);
      return [];
    }
    
    return data || [];
  } catch (e) {
    console.error('[ErrorLogger] Exception while fetching:', e);
    return [];
  }
}

export async function getErrorNotificationMode(): Promise<'visible' | 'silent'> {
  try {
    const supabase = getSupabaseAnonServer();
    if (!supabase) return 'visible';
    
    const { data } = await supabase
      .from('kv_settings')
      .select('value')
      .eq('key', 'error_notifications_mode')
      .single();
    
    if (data?.value) {
      const mode = JSON.parse(data.value);
      return mode === 'silent' ? 'silent' : 'visible';
    }
    
    return 'visible';
  } catch {
    return 'visible';
  }
}

export async function setErrorNotificationMode(mode: 'visible' | 'silent'): Promise<boolean> {
  try {
    const supabase = getSupabaseAnonServer();
    if (!supabase) return false;
    
    const { error } = await supabase
      .from('kv_settings')
      .upsert({
        key: 'error_notifications_mode',
        value: JSON.stringify(mode),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });
    
    return !error;
  } catch {
    return false;
  }
}
