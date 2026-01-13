import { TimeOffEntry } from './adminCalendar.types';

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
  };
}
