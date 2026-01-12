/**
 * Delete Calendar Entry Hook
 * 
 * React Query mutation hook for deleting calendar entries.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteEntry } from '../../data/adminCalendar';

export function useDeleteCalendarEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteEntry(id),
    onSuccess: () => {
      // Invalidate all calendar queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['adminCalendar'] });
    },
  });
}
