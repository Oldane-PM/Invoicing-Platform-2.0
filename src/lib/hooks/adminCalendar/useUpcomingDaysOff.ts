/**
 * Upcoming Days Off Hook
 * 
 * React Query hook for fetching upcoming calendar entries.
 */

import { useQuery } from '@tanstack/react-query';
import { getUpcomingEntries } from '../../data/adminCalendar';

export function useUpcomingDaysOff(days: number = 90) {
  return useQuery({
    queryKey: ['adminCalendar', 'upcoming', days],
    queryFn: () => getUpcomingEntries(days),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
