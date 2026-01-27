/**
 * useUpdateManagerAssignment Hook
 * 
 * Mutation hook to update a contractor's manager assignment.
 * Uses react-query for optimistic updates and cache invalidation.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateManagerAssignment } from "../../data/adminManagers";
import type { UpdateManagerAssignmentParams } from "../../data/adminManagers";

export function useUpdateManagerAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: UpdateManagerAssignmentParams) => updateManagerAssignment(params),
    onSuccess: () => {
      // Invalidate employee directory to refresh manager names
      queryClient.invalidateQueries({ queryKey: ["employeeDirectory"] });
    },
    onError: (error) => {
      console.error("[useUpdateManagerAssignment] Error:", error);
    },
  });
}
