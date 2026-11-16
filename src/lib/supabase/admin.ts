import { createClient, SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient<any, 'public', any> | null = null;

/**
 * Returns true if the true administrative service-role key is configured in the environment.
 */
export function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Returns a server-side Supabase client for background jobs, webhooks, and administrative operations.
 * Uses SUPABASE_SERVICE_ROLE_KEY when available; falls back to ANON key for background tasks.
 * NOTE: For user-facing API routes, always use the cookie-authenticated client from `createClient()`
 * to ensure Postgres RLS policies evaluate against the user's authenticated session.
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


