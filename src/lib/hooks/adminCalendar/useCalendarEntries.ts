/**
 * Calendar Entries Hook
 * 
 * React Query hook for fetching calendar entries for a specific month.
 */

import { useQuery } from '@tanstack/react-query';
import { getEntriesForMonth } from '../../data/adminCalendar';

export function useCalendarEntries(monthStartISO: string, monthEndISO: string) {
  return useQuery({
    queryKey: ['adminCalendar', 'entries', monthStartISO, monthEndISO],
    queryFn: () => getEntriesForMonth(monthStartISO, monthEndISO),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
