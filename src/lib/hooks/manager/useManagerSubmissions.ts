/**
 * useManagerSubmissions Hook
 *
 * Provides team submissions list with filtering for Manager portal.
 * Uses React Query for caching and automatic invalidation.
 */

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  listTeamSubmissions,
  type ManagerSubmission,
  type SubmissionFilters,
} from "../../supabase/repos/managerSubmissions.repo";
import { useAuth } from "../useAuth";

// Query key for cache invalidation
export const MANAGER_SUBMISSIONS_QUERY_KEY = "managerSubmissions";

interface UseManagerSubmissionsResult {
  submissions: ManagerSubmission[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useManagerSubmissions(
  filters: SubmissionFilters = {}
): UseManagerSubmissionsResult {
  const { user } = useAuth();
  const managerId = user?.id ?? null;

  // Memoize filters to prevent unnecessary refetches
  const stableFilters = useMemo(
    () => filters,
    [filters.status, filters.search, filters.limit]
  );

  const queryKey = useMemo(
    () => [MANAGER_SUBMISSIONS_QUERY_KEY, managerId, stableFilters] as const,
    [managerId, stableFilters]
  );

  const {
    data: submissions = [],
    isLoading,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!managerId) return [];
      return listTeamSubmissions(managerId, stableFilters);
    },
    enabled: !!managerId,
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
    submissions,
    loading: isLoading,
    error: error instanceof Error ? error : error ? new Error("Failed to fetch submissions") : null,
    refetch,
  };
}
