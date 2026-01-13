export type CalendarEntryType = 'Holiday' | 'Special Time Off';
export type CalendarAppliesTo = 'All' | 'Contractors' | 'Employees';

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
}

export interface UpdateTimeOffEntryParams extends Partial<CreateTimeOffEntryParams> {
  id: string;
}
