/**
 * Admin Calendar Repository
 * 
 * Data access layer for admin calendar functionality.
 * All Supabase queries for calendar entries are encapsulated here.
 * 
 * ARCHITECTURE: UI → Hooks → Repos → Supabase
 * This file is the ONLY place where admin calendar Supabase queries exist.
 */

import { getSupabaseClient } from '../../supabase/client';
import type {
  CalendarEntry,
  CreateCalendarEntryInput,
  UpdateCalendarEntryInput,
} from './adminCalendar.types';
import { mapDbRowsToCalendarEntries, mapDbRowToCalendarEntry } from './adminCalendar.mappers';

/**
 * Get calendar entries for a specific month
 * 
 * @param monthStartISO - Start of month in ISO format (YYYY-MM-DD)
 * @param monthEndISO - End of month in ISO format (YYYY-MM-DD)
 */
export async function getEntriesForMonth(
  monthStartISO: string,
  monthEndISO: string
): Promise<CalendarEntry[]> {
  const supabase = getSupabaseClient();

  // Simple query for date field (most common case)
  // If your schema uses start_date/end_date instead, this query will need adjustment
  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    .gte('date', monthStartISO)
    .lte('date', monthEndISO)
    .order('date', { ascending: true });

  if (error) {
    console.error('[AdminCalendar] Error fetching entries for month:', error);
    throw error;
  }

  return mapDbRowsToCalendarEntries(data || []);
}

/**
 * Get upcoming calendar entries (next N days from today)
 * 
 * @param days - Number of days to look ahead (default: 90)
 */
export async function getUpcomingEntries(days: number = 90): Promise<CalendarEntry[]> {
  const supabase = getSupabaseClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString().split('T')[0];

  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + days);
  const futureDateISO = futureDate.toISOString().split('T')[0];

  // Simple query for upcoming entries
  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    .gte('date', todayISO)
    .lte('date', futureDateISO)
    .order('date', { ascending: true });

  if (error) {
    console.error('[AdminCalendar] Error fetching upcoming entries:', error);
    throw error;
  }

  // TODO: If affected_contractor_count is not in the table, 
  // we may need to call an RPC function or view to get this data
  // For now, returning what's in the table (may be null)

  return mapDbRowsToCalendarEntries(data || []);
}

/**
 * Create a new calendar entry
 */
export async function createEntry(input: CreateCalendarEntryInput): Promise<CalendarEntry> {
  const supabase = getSupabaseClient();

  const insertData: any = {
    name: input.name,
    country: input.country || null,
    team_id: input.teamId || null,
    applies_to_all_teams: input.appliesToAllTeams ?? false,
  };

  // Add date fields based on what's provided
  if (input.date) {
    insertData.date = input.date;
  }
  if (input.startDate) {
    insertData.start_date = input.startDate;
  }
  if (input.endDate) {
    insertData.end_date = input.endDate;
  }

  const { data, error } = await supabase
    .from('holidays')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('[AdminCalendar] Error creating entry:', error);
    throw error;
  }

  return mapDbRowToCalendarEntry(data);
}

/**
 * Update an existing calendar entry
 */
export async function updateEntry(input: UpdateCalendarEntryInput): Promise<CalendarEntry> {
  const supabase = getSupabaseClient();

  const updateData: any = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.country !== undefined) updateData.country = input.country;
  if (input.teamId !== undefined) updateData.team_id = input.teamId;
  if (input.appliesToAllTeams !== undefined) updateData.applies_to_all_teams = input.appliesToAllTeams;
  if (input.date !== undefined) updateData.date = input.date;
  if (input.startDate !== undefined) updateData.start_date = input.startDate;
  if (input.endDate !== undefined) updateData.end_date = input.endDate;

  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('holidays')
    .update(updateData)
    .eq('id', input.id)
    .select()
    .single();

  if (error) {
    console.error('[AdminCalendar] Error updating entry:', error);
    throw error;
  }

  return mapDbRowToCalendarEntry(data);
}

/**
 * Delete a calendar entry
 */
export async function deleteEntry(id: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('holidays')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[AdminCalendar] Error deleting entry:', error);
    throw error;
  }
}
