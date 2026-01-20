/**
 * Admin Managers Repository
 * 
 * Data access layer for manager operations.
 * All Supabase queries for manager data are encapsulated here.
 * 
 * ARCHITECTURE: UI → Hooks → Repos → Supabase
 */

import { getSupabaseClient } from '../../supabase/client';
import type { ManagerOption, UpdateManagerAssignmentParams } from './adminManagers.types';

/**
 * Get all managers for selection in combobox
 * Returns users with role='MANAGER' from profiles table
 */
export async function getManagerOptions(): Promise<ManagerOption[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'MANAGER')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('[AdminManagers] Error fetching managers:', error);
    throw new Error(`Failed to fetch managers: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return data.map((m) => ({
    id: m.id,
    label: m.full_name || 'Unknown',
  }));
}

/**
 * Get current manager assignment for a contractor
 * Returns the manager_id from manager_teams table
 */
export async function getContractorManager(contractorId: string): Promise<string | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('manager_teams')
    .select('manager_id')
    .eq('contractor_id', contractorId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[AdminManagers] Error fetching contractor manager:', error);
    throw new Error(`Failed to fetch contractor manager: ${error.message}`);
  }

  return data?.manager_id || null;
}

/**
 * Update manager assignment for a contractor
 * Handles both adding new assignment and changing existing one
 */
export async function updateManagerAssignment(params: UpdateManagerAssignmentParams): Promise<void> {
  const supabase = getSupabaseClient();
  const { contractorId, newManagerId, oldManagerId } = params;

  // If removing manager assignment (newManagerId is null)
  if (!newManagerId) {
    if (oldManagerId) {
      const { error } = await supabase
        .from('manager_teams')
        .delete()
        .eq('contractor_id', contractorId)
        .eq('manager_id', oldManagerId);

      if (error) {
        console.error('[AdminManagers] Error removing manager assignment:', error);
        throw new Error(`Failed to remove manager assignment: ${error.message}`);
      }
    }
    return;
  }

  // If no previous manager, insert new assignment
  if (!oldManagerId) {
    const { error } = await supabase
      .from('manager_teams')
      .insert({
        manager_id: newManagerId,
        contractor_id: contractorId,
      });

    if (error) {
      // Check if it's a duplicate error (contractor already has this manager)
      if (error.code === '23505') {
        // Unique constraint violation - already assigned, ignore
        return;
      }
      console.error('[AdminManagers] Error adding manager assignment:', error);
      throw new Error(`Failed to add manager assignment: ${error.message}`);
    }
    return;
  }

  // If changing manager, delete old and insert new
  // Using a transaction-like approach: delete first, then insert
  if (oldManagerId !== newManagerId) {
    // Delete old assignment
    const { error: deleteError } = await supabase
      .from('manager_teams')
      .delete()
      .eq('contractor_id', contractorId)
      .eq('manager_id', oldManagerId);

    if (deleteError) {
      console.error('[AdminManagers] Error removing old manager assignment:', deleteError);
      throw new Error(`Failed to update manager assignment: ${deleteError.message}`);
    }

    // Insert new assignment
    const { error: insertError } = await supabase
      .from('manager_teams')
      .insert({
        manager_id: newManagerId,
        contractor_id: contractorId,
      });

    if (insertError) {
      console.error('[AdminManagers] Error adding new manager assignment:', insertError);
      throw new Error(`Failed to update manager assignment: ${insertError.message}`);
    }
  }
}
