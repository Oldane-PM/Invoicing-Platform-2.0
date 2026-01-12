/**
 * Admin Calendar Types
 * 
 * Type definitions for the Admin Calendar feature.
 * Maps to the holidays table in Supabase.
 */

export type CalendarViewMode = "month" | "year";

/**
 * Calendar entry (holiday/time-off) - Frontend representation
 * Mapped from holidays table (snake_case → camelCase)
 */
export interface CalendarEntry {
  id: string;
  organizationId: string;
  name: string;
  holidayDate: string; // ISO date string (YYYY-MM-DD)
  appliesToAll: boolean;
  country: string | null;
  teamId: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Computed/joined fields
  teamName?: string | null;
  affectedContractorCount?: number | null;
}

/**
 * Input for creating a new calendar entry
 */
export interface CreateCalendarEntryInput {
  name: string;
  holidayDate: string; // ISO date string (YYYY-MM-DD)
  appliesToAll: boolean;
  country?: string | null;
  teamId?: string | null;
  notes?: string | null;
}

/**
 * Input for updating an existing calendar entry
 */
export interface UpdateCalendarEntryInput {
  id: string;
  name?: string;
  holidayDate?: string;
  appliesToAll?: boolean;
  country?: string | null;
  teamId?: string | null;
  notes?: string | null;
}

/**
 * Database row type (snake_case) - matches Supabase schema
 */
export interface HolidayDbRow {
  id: string;
  organization_id: string;
  name: string;
  holiday_date: string;
  applies_to_all: boolean;
  country: string | null;
  team_id: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
