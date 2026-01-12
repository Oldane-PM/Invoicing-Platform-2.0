/**
 * Delete Calendar Entry Mutation Hook
 * 
 * Handles deleting calendar entries with automatic cache invalidation.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteEntry } from "../../data/adminCalendar/adminCalendar.repo";

export function useDeleteCalendarEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteEntry(id),
    onSuccess: () => {
      // Invalidate all calendar queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["adminCalendar"] });
    },
  });
}
