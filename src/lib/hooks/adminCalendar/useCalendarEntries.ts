/**
 * Calendar Entries Query Hook
 * 
 * Fetches calendar entries for a specific month range using React Query.
 */

import { useQuery } from "@tanstack/react-query";
import { getEntriesForMonth } from "../../data/adminCalendar/adminCalendar.repo";

export function useCalendarEntries(monthStartISO: string, monthEndISO: string) {
  return useQuery({
    queryKey: ["adminCalendar", "entries", monthStartISO, monthEndISO],
    queryFn: () => getEntriesForMonth(monthStartISO, monthEndISO),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
