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
 * Fetch all users from profiles table AND pending invitations
 * Combines both sources for admin visibility
 * Sorted by role (admin first) then by name
 */
export async function getUsers(): Promise<UserAccessUser[]> {
  const supabase = getSupabaseClient();

  // Fetch profiles (active users)
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active, invited_at, activated_at')
    .order('role', { ascending: true })
    .order('full_name', { ascending: true });

  if (profilesError) {
    console.error('[UserAccess] Error fetching profiles:', profilesError);
    throw profilesError;
  }

  // Fetch pending invitations (users who haven't signed in yet)
  const { data: invitations, error: invitationsError } = await supabase
    .from('user_invitations')
    .select('id, first_name, last_name, email, role, created_at, used_at')
    .is('used_at', null) // Only pending invitations
    .order('created_at', { ascending: false });

  if (invitationsError) {
    console.error('[UserAccess] Error fetching invitations:', invitationsError.message);
    // Don't throw - invitations are optional enhancement
  }

  // Map profiles
  const profileUsers = (profiles || []).map(mapDbUserToUserAccessUser);

  // Map invitations to UserAccessUser format
  const invitationUsers: UserAccessUser[] = (invitations || []).map((inv) => ({
    id: `invitation_${inv.id}`, // Prefix to distinguish from profile IDs
    fullName: `${inv.first_name} ${inv.last_name}`,
    email: inv.email,
    role: inv.role.toLowerCase() as UserRole,
    isActive: false, // Invitations show as INACTIVE until user signs in
    invitedAt: inv.created_at,
    activatedAt: null, // Never activated - they haven't signed in
  }));

  // Combine and return (profiles first, then pending invitations)
  return [...profileUsers, ...invitationUsers];
}

/**
 * Update user role in profiles table AND app_users table
 * Both tables are kept in sync to prevent role mismatch issues
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  const supabase = getSupabaseClient();

  // Update profiles table (primary source of truth for the app)
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  if (error) {
    console.error('[UserAccess] Error updating user role in profiles:', error);
    throw error;
  }

  // Also update app_users table to keep in sync
  const { error: appUserError } = await supabase
    .from('app_users')
    .update({ role })
    .eq('id', userId);

  if (appUserError) {
    console.error('[UserAccess] Error syncing role to app_users:', appUserError);
    // Non-fatal — don't throw, profiles is the primary source
  }
}

/**
 * Enable or disable user in profiles table AND app_users table
 * Both tables are kept in sync to prevent status mismatch issues
 */
export async function setUserEnabled(userId: string, isActive: boolean): Promise<void> {
  const supabase = getSupabaseClient();

  // Update profiles table (primary source of truth)
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId);

  if (error) {
    console.error('[UserAccess] Error updating user status in profiles:', error);
    throw error;
  }

  // Also update app_users table to keep in sync
  const { error: appUserError } = await supabase
    .from('app_users')
    .update({ is_active: isActive })
    .eq('id', userId);

  if (appUserError) {
    console.error('[UserAccess] Error syncing is_active to app_users:', appUserError);
    // Non-fatal — don't throw, profiles is the primary source
  }
}

/**
 * Mark user as activated on first login
 * Only updates if activated_at is currently NULL
 * This is called after successful authentication
 */
export async function markUserActivated(userId: string): Promise<void> {
  const supabase = getSupabaseClient();

  // First check if user needs activation
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('activated_at')
    .eq('id', userId)
    .single();

  if (fetchError) {
    console.error('[UserAccess] Error checking activation status:', fetchError);
    return; // Don't throw - this shouldn't block login
  }

  // Only update if not already activated
  if (profile && profile.activated_at === null) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ activated_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      console.error('[UserAccess] Error marking user activated:', updateError);
      // Don't throw - this shouldn't block login
    } else {
      console.log('[UserAccess] User activated successfully:', userId);
    }
  }
}
