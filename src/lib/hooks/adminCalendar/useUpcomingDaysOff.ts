/**
 * Upcoming Days Off Hook
 * 
 * React Query hook for fetching upcoming calendar entries.
 */

import { useQuery } from '@tanstack/react-query';
import { addDays } from 'date-fns';
import { getCalendarEntries } from '../../data/adminCalendar';

export function useUpcomingDaysOff(days: number = 90) {
  const today = new Date();
  const endDate = addDays(today, days);
  
  return useQuery({
    queryKey: ['adminCalendar', 'upcoming', days],
    queryFn: () => getCalendarEntries(today, endDate),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
