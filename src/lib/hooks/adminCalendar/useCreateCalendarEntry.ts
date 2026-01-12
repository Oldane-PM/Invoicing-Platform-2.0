/**
 * Create Calendar Entry Mutation Hook
 * 
 * Handles creating new calendar entries with automatic cache invalidation.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createEntry } from "../../data/adminCalendar/adminCalendar.repo";
import type { CreateCalendarEntryInput } from "../../data/adminCalendar/adminCalendar.types";

export function useCreateCalendarEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCalendarEntryInput) => createEntry(input),
    onSuccess: () => {
      // Invalidate all calendar queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["adminCalendar"] });
    },
  });
}
