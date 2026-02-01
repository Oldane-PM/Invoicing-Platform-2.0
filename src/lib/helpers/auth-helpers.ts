import { supabase } from '../supabase/client';
import type { UserRole } from '../supabase/repos/auth.repo';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  full_name?: string;
}

/**
 * Step 4: Check if user exists in Supabase by email
 * Returns user profile if exists, null if not found
 */
export async function checkUserByEmail(email: string): Promise<UserProfile | null> {
  try {
    console.log('[Auth Helper] Checking Supabase for email:', email);

    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, is_active, full_name')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - user doesn't exist
        console.log('[Auth Helper] User not found in Supabase');
        return null;
      }
      throw error;
    }

    console.log('[Auth Helper] User found:', data);
    return data as UserProfile;
  } catch (error) {
    console.error('[Auth Helper] Error checking user:', error);
    throw error;
  }
}

/**
 * Step 4: Create new user profile with 'unassigned' role
 * This is called when a user signs in with Google for the first time
 */
export async function createUnassignedProfile(
  userId: string,
  email: string,
  fullName?: string,
  role?: UserRole
): Promise<UserProfile> {
  try {
    console.log('[Auth Helper] Creating new profile for:', email);

    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        role: role || ('unassigned' as UserRole),
        is_active: true,
        full_name: fullName || null,
      })
      .select('id, email, role, is_active, full_name')
      .single();

    if (error) {
      console.error('[Auth Helper] Error creating profile:', error);
      throw error;
    }

    console.log('[Auth Helper] Profile created:', data);
    return data as UserProfile;
  } catch (error) {
    console.error('[Auth Helper] Error creating profile:', error);
    throw error;
  }
}

/**
 * Step 4: Get or create user profile
 * This is the main function that combines checking and creating
 */
export async function getOrCreateUserProfile(
  userId: string,
  email: string,
  fullName?: string,
  role?: UserRole
): Promise<UserProfile> {
  // First, check if user exists
  const existingUser = await checkUserByEmail(email);

  if (existingUser) {
    // User exists - return their profile
    return existingUser;
  }

  // User doesn't exist - create new profile with specified role (or 'unassigned')
  return await createUnassignedProfile(userId, email, fullName, role);
}
