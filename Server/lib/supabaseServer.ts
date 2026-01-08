/**
 * Server-side Supabase Client
 *
 * Uses the SERVICE_ROLE_KEY for admin-level access.
 * NEVER expose this key to the frontend!
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Log configuration status on startup
console.log('[supabaseServer] Configuration check:');
console.log('[supabaseServer] - SUPABASE_URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NOT SET');
console.log('[supabaseServer] - SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? `[${supabaseServiceRoleKey.length} chars]` : 'NOT SET');

if (!supabaseUrl) {
  console.error('[supabaseServer] ❌ SUPABASE_URL not configured - auth will fail!');
}

if (!supabaseServiceRoleKey) {
  console.error('[supabaseServer] ❌ SUPABASE_SERVICE_ROLE_KEY not configured - auth will fail!');
}

/**
 * Admin Supabase client with service role key
 * Has full access to all tables, bypasses RLS
 */
export const supabaseAdmin: SupabaseClient | null =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

/**
 * Check if Supabase server client is configured
 */
export const isSupabaseServerConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey);

/**
 * Get the admin Supabase client (throws if not configured)
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    throw new Error(
      'Supabase server client not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
  return supabaseAdmin;
}

/**
 * Verify a JWT access token and return the user
 * @param token - The JWT access token from Authorization header
 * @returns User object if valid, null if invalid
 */
export async function verifyToken(token: string): Promise<{
  id: string;
  email: string;
  role?: string;
} | null> {
  if (!supabaseAdmin) {
    console.error('[supabaseServer] Cannot verify token - client not configured');
    return null;
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      console.error('[supabaseServer] Token verification failed:', error?.message);
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
      role: user.role,
    };
  } catch (err) {
    console.error('[supabaseServer] Token verification exception:', err);
    return null;
  }
}
