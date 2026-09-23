import { createClient, SupabaseClient } from '@supabase/supabase-js';

const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
const procEnv = typeof process !== 'undefined' && process.env ? process.env : {};

const supabaseUrl =
  env.VITE_SUPABASE_URL ||
  procEnv.VITE_SUPABASE_URL ||
  'https://rjlfuefvovyqflctqvis.supabase.co';

const isNode = typeof window === 'undefined';

// In Node tests / backend tasks, use service role key for full administrative operations.
// In browser, exclusively use public anon key with user authentication sessions.
const anonKey =
  env.VITE_SUPABASE_ANON_KEY ||
  procEnv.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqbGZ1ZWZ2b3Z5cWZsY3RxdmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NTQ0NjcsImV4cCI6MjEwNTEzMDQ2N30.cnFxcvQUDtwy7JNSt2i_E14aLc4NAheIOOft0pzjrQw';

const serviceKey =
  procEnv.SUPABASE_SERVICE_ROLE_KEY ||
  env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqbGZ1ZWZ2b3Z5cWZsY3RxdmlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTU1NDQ2NywiZXhwIjoyMTA1MTMwNDY3fQ.CJyFJs1uiJOYWWGyxWZWM8IRA618tH0PzmHHMOsTCcY';

const activeKey = isNode ? serviceKey : anonKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  activeKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  activeKey !== 'your-anon-key-here'
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, activeKey)
  : null;

/**
 * Check if connection to Supabase database is active and responding
 */
export async function checkDatabaseConnection(): Promise<{ ok: boolean; message?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, message: 'Supabase credentials are not configured.' };
  }
  try {
    const { error } = await supabase.from('shops').select('id').limit(1);
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Database connection error' };
  }
}

