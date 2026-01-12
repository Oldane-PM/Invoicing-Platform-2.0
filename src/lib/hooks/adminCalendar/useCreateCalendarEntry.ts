/**
 * Create Calendar Entry Hook
 * 
 * React Query mutation hook for creating calendar entries.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createEntry } from '../../data/adminCalendar';
import type { CreateCalendarEntryInput } from '../../data/adminCalendar';

export function useCreateCalendarEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCalendarEntryInput) => createEntry(input),
    onSuccess: () => {
      // Invalidate all calendar queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['adminCalendar'] });
    },
  });
}
