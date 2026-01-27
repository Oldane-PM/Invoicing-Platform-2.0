import { TimeOffEntry, TimeOffScopeType } from './adminCalendar.types';

export function mapCalendarEntryToDomain(data: any): TimeOffEntry {
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    description: data.description || undefined,
    startDate: new Date(data.start_date + 'T00:00:00'), // Ensure local date interpretation
    endDate: new Date(data.end_date + 'T00:00:00'),
    country: data.country || ['all'],
    team: data.team || ['all'],
    appliesTo: data.applies_to,
    affectedCount: data.affected_count || 0,
    // New role-based scope fields
    appliesToType: (data.applies_to_type || 'ALL') as TimeOffScopeType,
    appliesToRoles: data.applies_to_roles || [],
  };
}
