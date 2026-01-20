import { getSupabaseClient } from '../../supabase/client';
import { TimeOffEntry, CreateTimeOffEntryParams, UpdateTimeOffEntryParams, UpcomingTimeOffItem, TimeOffScopeType } from './adminCalendar.types';
import { mapCalendarEntryToDomain } from './adminCalendar.mappers';

/**
 * Get calendar entries within a date range
 */
export async function getCalendarEntries(start: Date, end: Date): Promise<TimeOffEntry[]> {
  const supabase = getSupabaseClient();
  
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    // Logic: entry start <= range end AND entry end >= range start
    .lte('start_date', endStr)
    .gte('end_date', startStr)
    .order('start_date', { ascending: true });

  if (error) {
    console.error('[AdminCalendar] Error fetching entries:', error);
    throw error;
  }

  return (data || []).map(mapCalendarEntryToDomain);
}

/**
 * Create a new calendar entry
 */
export async function createCalendarEntry(params: CreateTimeOffEntryParams): Promise<TimeOffEntry> {
  const supabase = getSupabaseClient();

  // Only include columns that exist in the base holidays table (migration 017)
  // Columns: id, name, type, description, start_date, end_date, country, team, applies_to, affected_count
  const insertData = {
    name: params.name,
    type: params.type,
    description: params.description || null,
    start_date: params.startDate,
    end_date: params.endDate,
    country: params.country || ['all'],
    team: params.team || ['all'],
    // Map 'ROLES' scope to 'Contractors' for backward compatibility with 017 schema
    applies_to: params.appliesToType === 'ROLES' ? 'Contractors' : params.appliesTo,
    affected_count: params.affectedCount || 0,
  };

  console.log('[AdminCalendar] Creating entry with data:', insertData);

  const { data, error } = await supabase
    .from('holidays')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('[AdminCalendar] Error creating entry:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      status: (error as any).status,
      error,
    });
    throw error;
  }

  return mapCalendarEntryToDomain(data);
}

/**
 * Update an existing calendar entry
 */
export async function updateCalendarEntry(params: UpdateTimeOffEntryParams): Promise<TimeOffEntry> {
  const supabase = getSupabaseClient();

  // Only include columns that exist in the base holidays table (migration 017)
  const updateData: Record<string, any> = {};
  if (params.name) updateData.name = params.name;
  if (params.type) updateData.type = params.type;
  if (params.description !== undefined) updateData.description = params.description;
  if (params.startDate) updateData.start_date = params.startDate;
  if (params.endDate) updateData.end_date = params.endDate;
  if (params.country) updateData.country = params.country;
  if (params.appliesTo) updateData.applies_to = params.appliesTo;
  // Map 'ROLES' scope to 'Contractors'
  if (params.appliesToType === 'ROLES') updateData.applies_to = 'Contractors';
  if (params.affectedCount !== undefined) updateData.affected_count = params.affectedCount;
  updateData.updated_at = new Date().toISOString();

  console.log('[AdminCalendar] Updating entry:', params.id, updateData);

  const { data, error } = await supabase
    .from('holidays')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    console.error('[AdminCalendar] Error updating entry:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      status: (error as any).status,
      error,
    });
    throw error;
  }

  return mapCalendarEntryToDomain(data);
}

/**
 * Delete a calendar entry
 */
export async function deleteCalendarEntry(id: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('holidays')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[AdminCalendar] Error deleting entry:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      status: (error as any).status,
      error,
    });
    throw error;
  }
}

/**
 * Get upcoming calendar entries that overlap with a date range.
 * 
 * An entry is "upcoming" if ANY part of it overlaps with [startDate, endDate]:
 *   - entry.start_date <= endDate (starts before or on range end)
 *   - entry.end_date >= startDate OR entry.end_date IS NULL (ends after or on range start, or is ongoing)
 * 
 * This catches:
 *   - Today's holidays
 *   - Ongoing multi-day time off (started in past, continues into future)
 *   - All future time off within range
 * 
 * Returns UpcomingTimeOffItem with computed affected contractor count.
 */
export async function getUpcomingCalendarEntries(startDate: Date, endDate: Date): Promise<UpcomingTimeOffItem[]> {
  const supabase = getSupabaseClient();
  
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  // Try to use the view with computed affected count first
  // Fall back to regular holidays table if view doesn't exist
  let data: any[] | null = null;
  let error: any = null;

  // Attempt to query from the view with affected count
  const viewResult = await supabase
    .from('holidays_with_affected_count')
    .select('*')
    .lte('start_date', endStr)
    .or(`end_date.is.null,end_date.gte.${startStr}`)
    .order('start_date', { ascending: true });

  if (viewResult.error) {
    // View might not exist yet, fall back to regular table
    console.warn('[AdminCalendar] View not available, falling back to holidays table:', viewResult.error.message);
    
    const fallbackResult = await supabase
      .from('holidays')
      .select('*')
      .lte('start_date', endStr)
      .or(`end_date.is.null,end_date.gte.${startStr}`)
      .order('start_date', { ascending: true });
    
    data = fallbackResult.data;
    error = fallbackResult.error;
  } else {
    data = viewResult.data;
  }

  if (error) {
    console.error('[AdminCalendar] Error fetching upcoming entries:', error);
    throw error;
  }

  return (data || []).map((row): UpcomingTimeOffItem => {
    const entry = mapCalendarEntryToDomain(row);
    return {
      ...entry,
      // Use computed count from view, or fall back to stored affected_count
      affectedContractorCount: row.computed_affected_count ?? row.affected_count ?? 0,
    };
  });
}

/**
 * Get the affected contractor count for a specific scope configuration.
 * Calls the Supabase RPC function to compute the count.
 */
export async function getAffectedContractorCount(
  scopeType: TimeOffScopeType,
  scopeRoles: string[]
): Promise<number> {
  const supabase = getSupabaseClient();

  try {
    // Map domain scope types to DB parameters
    const appliesTo = scopeType === 'ROLES' ? 'Contractors' : 'All';
    // For now, we don't have a way to filter by roles in the default schema,
    // so we just pass NULL for team unless we want to map roles to team?
    // Leaving team as NULL or empty array.
    
    const { data, error } = await supabase.rpc('get_time_off_affected_count', {
      p_applies_to: appliesTo,
      p_team: null, // or pass scopeRoles as team if that was the intent? but team is usually 'engineering' etc.
    });

    if (error) {
      console.error('[AdminCalendar] Error getting affected count:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      // Return 0 on error to not block the UI
      return 0;
    }

    return data || 0;
  } catch (err) {
    console.error('[AdminCalendar] Exception getting affected count:', err);
    return 0;
  }
}

/**
 * Get total contractor count (for ALL scope estimation)
 */
export async function getTotalContractorCount(): Promise<number> {
  const supabase = getSupabaseClient();

  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'CONTRACTOR');

    if (error) {
      console.error('[AdminCalendar] Error getting total contractor count:', error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error('[AdminCalendar] Exception getting total contractor count:', err);
    return 0;
  }
}

