import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getCalendarEntries,
  createCalendarEntry,
  updateCalendarEntry,
  deleteCalendarEntry,
  CreateTimeOffEntryParams,
  UpdateTimeOffEntryParams,
  TimeOffEntry,
} from '../../data/adminCalendar';

export const ADMIN_CALENDAR_keys = {
  all: ['adminCalendar'] as const,
  range: (start: Date, end: Date) => [...ADMIN_CALENDAR_keys.all, 'range', start.toISOString(), end.toISOString()] as const,
  upcoming: (days: number) => ['adminCalendar', 'upcoming', days] as const,
};

/**
 * Hook to fetch calendar entries for a date range
 */
export function useCalendarEntries(start: Date, end: Date) {
  return useQuery({
    queryKey: ADMIN_CALENDAR_keys.range(start, end),
    queryFn: () => getCalendarEntries(start, end),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to create a new calendar entry
 */
export function useCreateCalendarEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateTimeOffEntryParams) => createCalendarEntry(params),
    onSuccess: () => {
      toast.success('Time off added successfully');
      // Invalidate all calendar queries (includes range queries)
      queryClient.invalidateQueries({ queryKey: ADMIN_CALENDAR_keys.all });
      // Also invalidate upcoming queries (they have different key prefix pattern)
      queryClient.invalidateQueries({ queryKey: ['adminCalendar', 'upcoming'] });
    },
    onError: (error: any) => {
      const message = error?.message || 'Unknown error';
      toast.error(`Failed to create time off entry: ${message}`);
      console.error('[useCreateCalendarEntry] Error:', { message, error });
    },
  });
}

/**
 * Hook to update an existing calendar entry
 */
export function useUpdateCalendarEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: UpdateTimeOffEntryParams) => updateCalendarEntry(params),
    onSuccess: () => {
      toast.success('Time off updated successfully');
      queryClient.invalidateQueries({ queryKey: ADMIN_CALENDAR_keys.all });
      queryClient.invalidateQueries({ queryKey: ['adminCalendar', 'upcoming'] });
    },
    onError: (error: any) => {
      const message = error?.message || 'Unknown error';
      toast.error(`Failed to update time off entry: ${message}`);
      console.error('[useUpdateCalendarEntry] Error:', { message, error });
    },
  });
}

/**
 * Hook to delete a calendar entry
 */
export function useDeleteCalendarEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCalendarEntry(id),
    onSuccess: () => {
      toast.success('Time off removed successfully');
      queryClient.invalidateQueries({ queryKey: ADMIN_CALENDAR_keys.all });
      queryClient.invalidateQueries({ queryKey: ['adminCalendar', 'upcoming'] });
    },
    onError: (error: any) => {
      const message = error?.message || 'Unknown error';
      toast.error(`Failed to delete time off entry: ${message}`);
      console.error('[useDeleteCalendarEntry] Error:', { message, error });
    },
  });
}

/**
 * Non-Working Days Hook
 * 
 * Returns a Set of yyyy-MM-dd strings representing non-working days
 * for the contractor portal. Filters by:
 * 1. appliesToType = "ALL" (applies to everyone)
 * 2. appliesToType = "ROLES" AND contractor's role is in appliesToRoles
 * 
 * @param rangeStart - Start of the date range to check
 * @param rangeEnd - End of the date range to check
 * @param contractorRole - Optional role of the current contractor for filtering
 */
export function useNonWorkingDays(rangeStart: Date, rangeEnd: Date, contractorRole?: string) {
  const query = useQuery({
    queryKey: ADMIN_CALENDAR_keys.range(rangeStart, rangeEnd),
    queryFn: () => getCalendarEntries(rangeStart, rangeEnd),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Build a Set of blocked date strings (yyyy-MM-dd)
  const nonWorkingDays = useMemo(() => {
    const daysSet = new Set<string>();

    if (!query.data) return daysSet;

    query.data.forEach((entry: TimeOffEntry) => {
      // Check if this time-off entry applies to the contractor
      let applies = false;
      
      // ALL scope always applies
      if (entry.appliesToType === 'ALL') {
        applies = true;
      }
      // ROLES scope - check if contractor's role is in the list
      else if (entry.appliesToType === 'ROLES' && contractorRole) {
        const rolesLower = (entry.appliesToRoles || []).map(r => r.toLowerCase());
        applies = rolesLower.includes(contractorRole.toLowerCase());
      }
      // Legacy fallback: if no appliesToType, use old appliesTo field
      else if (!entry.appliesToType) {
        applies = entry.appliesTo === 'All' || entry.appliesTo === 'Contractors';
      }

      if (!applies) return;

      const start = new Date(entry.startDate);
      const end = new Date(entry.endDate);

      // Normalize to midnight
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      // Generate all dates in range
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10); // yyyy-MM-dd
        daysSet.add(key);
      }
    });

    return daysSet;
  }, [query.data, contractorRole]);

  return {
    ...query,
    nonWorkingDays,
  };
}
