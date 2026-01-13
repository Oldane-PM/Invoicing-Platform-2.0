import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getCalendarEntries,
  createCalendarEntry,
  updateCalendarEntry,
  deleteCalendarEntry,
  CreateTimeOffEntryParams,
  UpdateTimeOffEntryParams,
} from '../../data/adminCalendar';

export const ADMIN_CALENDAR_keys = {
  all: ['adminCalendar'] as const,
  range: (start: Date, end: Date) => [...ADMIN_CALENDAR_keys.all, 'range', start.toISOString(), end.toISOString()] as const,
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
      queryClient.invalidateQueries({ queryKey: ADMIN_CALENDAR_keys.all });
    },
    onError: (error) => {
      toast.error('Failed to create time off entry');
      console.error(error);
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
    },
    onError: (error) => {
      toast.error('Failed to update time off entry');
      console.error(error);
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
    },
    onError: (error) => {
      toast.error('Failed to delete time off entry');
      console.error(error);
    },
  });
}
