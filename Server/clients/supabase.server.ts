/**
 * Supabase Server Client
 * 
 * Uses the service role key for backend operations.
 * This client bypasses RLS policies and should ONLY be used server-side.
 * 
 * IMPORTANT: SUPABASE_SERVICE_ROLE_KEY must NEVER be exposed to the frontend.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create server-side Supabase client with service role
let supabaseAdmin: SupabaseClient | null = null;

if (supabaseUrl && supabaseServiceRoleKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  console.log('[supabase.server] Client initialized successfully');
} else {
  console.error('[supabase.server] Missing environment variables:');
  if (!supabaseUrl) console.error('  - SUPABASE_URL not set');
  if (!supabaseServiceRoleKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY not set');
}

/**
 * Get the Supabase admin client (service role)
 * Throws if not configured
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    throw new Error(
      'Supabase server client not configured. ' +
      'Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
    );
  }
  return supabaseAdmin;
}

/**
 * Check if Supabase server is configured
 */
export function isSupabaseServerConfigured(): boolean {
  return !!supabaseAdmin;
}

export default supabaseAdmin;
