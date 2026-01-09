/**
 * useCurrentUserId Hook
 * 
 * Get the current authenticated user's ID from Supabase auth.
 */

import { useAuth } from '../useAuth';

export function useCurrentUserId(): string | null {
  const { user } = useAuth();
  return user?.id ?? null;
}
