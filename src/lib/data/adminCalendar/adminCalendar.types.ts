/**
 * Admin Calendar Types
 * 
 * Type definitions for calendar entries and related data.
 */

export type CalendarViewMode = 'month' | 'year';

export interface CalendarEntry {
  id: string;
  name: string;
  date?: string;              // ISO date for single-day entries
  startDate?: string;         // ISO date for range start
  endDate?: string;           // ISO date for range end
  country?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  appliesToAllTeams?: boolean;
  affectedContractorCount?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCalendarEntryInput {
  name: string;
  date?: string;              // For single-day entries
  startDate?: string;         // For range entries
  endDate?: string;
  country?: string | null;
  teamId?: string | null;
  appliesToAllTeams?: boolean;
}

export interface UpdateCalendarEntryInput {
  id: string;
  name?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  country?: string | null;
  teamId?: string | null;
  appliesToAllTeams?: boolean;
}
