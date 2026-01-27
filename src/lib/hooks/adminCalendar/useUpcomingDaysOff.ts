/**
 * Upcoming Days Off Hook
 *
 * Fetches ALL upcoming time off entries that overlap
 * with the next N days (including ongoing multi-day events).
 * 
 * An entry is upcoming if ANY part of it overlaps with [today → endDate]:
 *   - entry.start_date <= endDate
 *   - entry.end_date >= today OR entry.end_date IS NULL
 */

import { useQuery } from '@tanstack/react-query';
import { addDays, startOfDay } from 'date-fns';
import { getUpcomingCalendarEntries } from '../../data/adminCalendar';

export function useUpcomingDaysOff(days: number = 90) {
  // Normalize to start of day for consistent date comparisons
  const today = startOfDay(new Date());
  const endDate = addDays(today, days);

  return useQuery({
    queryKey: ['adminCalendar', 'upcoming', days],
    queryFn: () => getUpcomingCalendarEntries(today, endDate),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
