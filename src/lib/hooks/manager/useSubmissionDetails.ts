/**
 * useSubmissionDetails Hook
 *
 * Provides detailed submission data for a single submission.
 * Uses React Query for caching and automatic invalidation.
 */

import { useQuery } from "@tanstack/react-query";
import {
  getSubmissionDetails,
  type ManagerSubmission,
} from "../../supabase/repos/managerSubmissions.repo";
import { useAuth } from "../useAuth";

// Query key for cache invalidation
export const MANAGER_SUBMISSION_DETAILS_QUERY_KEY = "managerSubmissionDetails";

interface UseSubmissionDetailsResult {
  submission: ManagerSubmission | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSubmissionDetails(
  submissionId: string | null
): UseSubmissionDetailsResult {
  const { user } = useAuth();
  const managerId = user?.id ?? null;

  const {
    data: submission = null,
    isLoading,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: [MANAGER_SUBMISSION_DETAILS_QUERY_KEY, submissionId, managerId],
    queryFn: async () => {
      if (!managerId || !submissionId) return null;
      return getSubmissionDetails(submissionId, managerId);
    },
    enabled: !!managerId && !!submissionId,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  const refetch = async () => {
    await queryRefetch();
  };

  return {
    submission,
    loading: isLoading,
    error: error instanceof Error ? error : error ? new Error("Failed to fetch submission details") : null,
    refetch,
  };
}
