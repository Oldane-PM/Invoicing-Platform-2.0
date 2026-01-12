/**
 * Upcoming Days Off Query Hook
 * 
 * Fetches upcoming calendar entries (next N days) using React Query.
 */

import { useQuery } from "@tanstack/react-query";
import { getUpcomingEntries } from "../../data/adminCalendar/adminCalendar.repo";

export function useUpcomingDaysOff(days: number = 90) {
  return useQuery({
    queryKey: ["adminCalendar", "upcoming", days],
    queryFn: () => getUpcomingEntries(days),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
