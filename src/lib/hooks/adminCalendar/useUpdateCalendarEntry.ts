/**
 * Update Calendar Entry Hook
 * 
 * React Query mutation hook for updating calendar entries.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateEntry } from '../../data/adminCalendar';
import type { UpdateCalendarEntryInput } from '../../data/adminCalendar';

export function useUpdateCalendarEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCalendarEntryInput) => updateEntry(input),
    onSuccess: () => {
      // Invalidate all calendar queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['adminCalendar'] });
    },
  });
}
