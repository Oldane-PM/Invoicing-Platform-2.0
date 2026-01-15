import { getSupabaseClient } from '../../supabase/client';
import { TimeOffEntry, CreateTimeOffEntryParams, UpdateTimeOffEntryParams } from './adminCalendar.types';
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

  const insertData = {
    name: params.name,
    type: params.type,
    description: params.description,
    start_date: params.startDate,
    end_date: params.endDate,
    country: params.country,
    team: params.team,
    applies_to: params.appliesTo,
    affected_count: params.affectedCount,
  };

  console.log('[AdminCalendar] Creating entry with data:', insertData);

  const { data, error } = await supabase
    .from('holidays')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('[AdminCalendar] Error creating entry:', error);
    throw error;
  }

  return mapCalendarEntryToDomain(data);
}

/**
 * Update an existing calendar entry
 */
export async function updateCalendarEntry(params: UpdateTimeOffEntryParams): Promise<TimeOffEntry> {
  const supabase = getSupabaseClient();

  const updateData: any = {};
  if (params.name) updateData.name = params.name;
  if (params.type) updateData.type = params.type;
  if (params.description !== undefined) updateData.description = params.description;
  if (params.startDate) updateData.start_date = params.startDate;
  if (params.endDate) updateData.end_date = params.endDate;
  if (params.country) updateData.country = params.country;
  if (params.team) updateData.team = params.team;
  if (params.appliesTo) updateData.applies_to = params.appliesTo;
  if (params.affectedCount !== undefined) updateData.affected_count = params.affectedCount;
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('holidays')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    console.error('[AdminCalendar] Error updating entry:', error);
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
    console.error('[AdminCalendar] Error deleting entry:', error);
    throw error;
  }
}
