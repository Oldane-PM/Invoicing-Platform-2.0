/**
 * Admin Calendar Mappers
 * 
 * Maps database rows to domain types (snake_case → camelCase).
 */

import type { CalendarEntry } from './adminCalendar.types';

/**
 * Map database row to CalendarEntry domain type
 */
export function mapDbRowToCalendarEntry(row: any): CalendarEntry {
  return {
    id: row.id,
    name: row.name,
    date: row.date || undefined,
    startDate: row.start_date || undefined,
    endDate: row.end_date || undefined,
    country: row.country || null,
    teamId: row.team_id || null,
    teamName: row.team_name || null,
    appliesToAllTeams: row.applies_to_all_teams ?? false,
    affectedContractorCount: row.affected_contractor_count ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Map array of database rows to CalendarEntry array
 */
export function mapDbRowsToCalendarEntries(rows: any[]): CalendarEntry[] {
  return rows.map(mapDbRowToCalendarEntry);
}
