/**
 * Update Calendar Entry Mutation Hook
 * 
 * Handles updating existing calendar entries with automatic cache invalidation.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateEntry } from "../../data/adminCalendar/adminCalendar.repo";
import type { UpdateCalendarEntryInput } from "../../data/adminCalendar/adminCalendar.types";

export function useUpdateCalendarEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCalendarEntryInput) => updateEntry(input),
    onSuccess: () => {
      // Invalidate all calendar queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["adminCalendar"] });
    },
  });
}
