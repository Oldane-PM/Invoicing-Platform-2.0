/**
 * useDeleteSubmission Hook
 *
 * Provides state management for deleting a submission.
 * Uses React Query mutation with automatic cache invalidation.
 * 
 * Deletion is blocked for APPROVED and PAID submissions (enforced by data layer).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getSubmissionsDataSource } from "../../data/submissionsDataSource";
import { SUBMISSIONS_QUERY_KEY } from "./useSubmissions";
import { SUBMITTED_PERIODS_QUERY_KEY } from "./useSubmittedPeriods";

interface UseDeleteSubmissionResult {
  deleteSubmission: (submissionId: string) => Promise<boolean>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useDeleteSubmission(): UseDeleteSubmissionResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (submissionId: string): Promise<void> => {
      console.log("[useDeleteSubmission] Deleting submission:", submissionId);
      const dataSource = getSubmissionsDataSource();
      await dataSource.deleteSubmission(submissionId);
    },
    onSuccess: (_result, submissionId) => {
      console.log("[useDeleteSubmission] Submission deleted:", submissionId);
      // Invalidate all submission queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: [SUBMISSIONS_QUERY_KEY] });
      // Also invalidate submitted periods cache so month picker updates
      queryClient.invalidateQueries({ queryKey: [SUBMITTED_PERIODS_QUERY_KEY] });
    },
    onError: (err) => {
      console.error("[useDeleteSubmission] Error deleting submission:", err);
    },
  });

  const deleteSubmission = async (submissionId: string): Promise<boolean> => {
    try {
      await mutation.mutateAsync(submissionId);
      return true;
    } catch {
      return false;
    }
  };

  const reset = () => {
    mutation.reset();
  };

  return {
    deleteSubmission,
    loading: mutation.isPending,
    error: mutation.error instanceof Error
      ? mutation.error
      : mutation.error
      ? new Error("Failed to delete submission")
      : null,
    reset,
  };
}
