export type CalendarEntryType = 'Holiday' | 'Special Time Off' | 'Company Event';
export type CalendarAppliesTo = 'All' | 'Contractors' | 'Managers';

// New scope types for role-based time-off
export type TimeOffScopeType = 'ALL' | 'ROLES';

export interface TimeOffEntry {
  id: string;
  name: string;
  type: CalendarEntryType;
  description?: string;
  startDate: Date;
  endDate: Date;
  country: string[];
  team: string[];
  appliesTo: CalendarAppliesTo;
  affectedCount: number;
  // New role-based scope fields
  appliesToType: TimeOffScopeType;
  appliesToRoles: string[];
}

export interface CreateTimeOffEntryParams {
  name: string;
  type: CalendarEntryType;
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  country: string[];
  team: string[];
  appliesTo: CalendarAppliesTo;
  affectedCount: number;
  // New role-based scope fields
  appliesToType: TimeOffScopeType;
  appliesToRoles: string[];
}

export interface UpdateTimeOffEntryParams extends Partial<CreateTimeOffEntryParams> {
  id: string;
}

/**
 * Extended time-off entry for upcoming panel with computed affected count
 */
export interface UpcomingTimeOffItem extends TimeOffEntry {
  affectedContractorCount: number;
}
