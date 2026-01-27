/**
 * useCreateSubmission Hook
 *
 * Provides state management for creating a new submission and resubmitting rejected ones.
 * Uses React Query mutation with automatic cache invalidation.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ContractorSubmission, SubmissionDraft } from "../../types";
import { getSubmissionsDataSource } from "../../data/submissionsDataSource";
import { SUBMISSIONS_QUERY_KEY } from "./useSubmissions";
import { SUBMITTED_PERIODS_QUERY_KEY } from "./useSubmittedPeriods";

// Re-export query key for use in other hooks
export { SUBMISSIONS_QUERY_KEY };

interface UseCreateSubmissionResult {
  create: (draft: SubmissionDraft) => Promise<ContractorSubmission | null>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useCreateSubmission(): UseCreateSubmissionResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (draft: SubmissionDraft): Promise<ContractorSubmission> => {
      console.log("[useCreateSubmission] Creating submission...");
      const dataSource = getSubmissionsDataSource();
      return dataSource.createSubmission(draft);
    },
    onSuccess: (newSubmission) => {
      console.log("[useCreateSubmission] Submission created, invalidating queries:", newSubmission.id);
      // Invalidate all submission queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: [SUBMISSIONS_QUERY_KEY] });
      // Also invalidate submitted periods cache so month picker updates
      queryClient.invalidateQueries({ queryKey: [SUBMITTED_PERIODS_QUERY_KEY] });
    },
    onError: (err) => {
      console.error("[useCreateSubmission] Error creating submission:", err);
    },
  });

  const create = async (draft: SubmissionDraft): Promise<ContractorSubmission | null> => {
    try {
      const result = await mutation.mutateAsync(draft);
      return result;
    } catch {
      return null;
    }
  };

  const reset = () => {
    mutation.reset();
  };

  return {
    create,
    loading: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error : mutation.error ? new Error("Failed to create submission") : null,
    reset,
  };
}

/**
 * Hook for resubmitting a rejected submission
 * Only works for submissions in REJECTED_CONTRACTOR status
 */
interface UseResubmitSubmissionResult {
  resubmit: (submissionId: string, updatedData?: Partial<SubmissionDraft>) => Promise<ContractorSubmission | null>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useResubmitSubmission(): UseResubmitSubmissionResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      submissionId,
      updatedData,
    }: {
      submissionId: string;
      updatedData?: Partial<SubmissionDraft>;
    }): Promise<ContractorSubmission> => {
      console.log("[useResubmitSubmission] Resubmitting submission:", submissionId);
      const dataSource = getSubmissionsDataSource();
      return dataSource.resubmitAfterRejection(submissionId, updatedData);
    },
    onSuccess: (result) => {
      console.log("[useResubmitSubmission] Resubmission successful:", result.id);
      // Invalidate all submission queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: [SUBMISSIONS_QUERY_KEY] });
      // Also invalidate submitted periods cache
      queryClient.invalidateQueries({ queryKey: [SUBMITTED_PERIODS_QUERY_KEY] });
    },
    onError: (err) => {
      console.error("[useResubmitSubmission] Error resubmitting:", err);
    },
  });

  const resubmit = async (
    submissionId: string,
    updatedData?: Partial<SubmissionDraft>
  ): Promise<ContractorSubmission | null> => {
    try {
      const result = await mutation.mutateAsync({ submissionId, updatedData });
      return result;
    } catch {
      return null;
    }
  };

  const reset = () => {
    mutation.reset();
  };

  return {
    resubmit,
    loading: mutation.isPending,
    error: mutation.error instanceof Error
      ? mutation.error
      : mutation.error
      ? new Error("Failed to resubmit")
      : null,
    reset,
  };
}
