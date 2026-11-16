import { createClient, SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient<any, 'public', any> | null = null;

/**
 * Returns a server-side Supabase client with elevated privileges for background jobs,
 * webhooks, storage artifact ingestion, and administrative operations.
 */
export function getSupabaseAdmin(): SupabaseClient<any, 'public', any> {
  if (adminClient) return adminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase environment variables (URL & Key) are not configured.');
  }

  adminClient = createClient<any>(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
}
