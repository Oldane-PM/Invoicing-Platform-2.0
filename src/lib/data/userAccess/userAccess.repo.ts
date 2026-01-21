/**
 * User Access Repository
 * 
 * Encapsulates ALL Supabase queries for User Access Management.
 * This is the ONLY file that imports the Supabase client.
 */

import { getSupabaseClient } from '../../supabase/client';
import { mapDbUserToUserAccessUser } from './userAccess.mappers';
import type { UserAccessUser, UserRole } from './userAccess.types';

/**
 * Fetch all users from profiles table
 * Sorted by role (admin first) then by name
 */
export async function getUsers(): Promise<UserAccessUser[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active')
    .order('role', { ascending: true })
    .order('full_name', { ascending: true });

  if (error) {
    console.error('[UserAccess] Error fetching users:', error);
    throw error;
  }

  if (!data) {
    return [];
  }

  return data.map(mapDbUserToUserAccessUser);
}

/**
 * Update user role in profiles table
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  if (error) {
    console.error('[UserAccess] Error updating user role:', error);
    throw error;
  }
}

/**
 * Enable or disable user in profiles table
 */
export async function setUserEnabled(userId: string, isActive: boolean): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId);

  if (error) {
    console.error('[UserAccess] Error updating user status:', error);
    throw error;
  }
}
