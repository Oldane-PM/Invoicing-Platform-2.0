/**
 * useSubmittedPeriods Hook
 *
 * Fetches work periods that already have submissions for the current user.
 * Used to prevent duplicate submissions for the same work period.
 */

import { useQuery } from "@tanstack/react-query";
import { getSubmissionsDataSource } from "../../data/submissionsDataSource";
import { useAuth } from "../useAuth";
import { isSupabaseConfigured } from "../../supabase/client";

export const SUBMITTED_PERIODS_QUERY_KEY = "submittedWorkPeriods";

interface UseSubmittedPeriodsResult {
  submittedPeriods: string[]; // Array of "YYYY-MM" strings
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  /**
   * Check if a specific work period already has a submission
   * @param workPeriod - Work period in "YYYY-MM" format
   */
  isAlreadySubmitted: (workPeriod: string) => boolean;
  /**
   * Check if a specific month/year already has a submission
   * @param month - 0-indexed month (0 = January)
   * @param year - Full year (e.g., 2026)
   */
  isMonthSubmitted: (month: number, year: number) => boolean;
}

export function useSubmittedPeriods(): UseSubmittedPeriodsResult {
  const { user } = useAuth();

  const {
    data: submittedPeriods = [],
    isLoading,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: [SUBMITTED_PERIODS_QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        throw new Error("Supabase is not configured");
      }
      console.log("[useSubmittedPeriods] Fetching for user:", user?.id);
      const dataSource = getSubmissionsDataSource();
      return dataSource.getSubmittedWorkPeriods();
    },
    enabled: !!user && isSupabaseConfigured,
    staleTime: 30000, // 30 seconds
  });

  const refetch = async () => {
    await queryRefetch();
  };

  const isAlreadySubmitted = (workPeriod: string): boolean => {
    return submittedPeriods.includes(workPeriod);
  };

  const isMonthSubmitted = (month: number, year: number): boolean => {
    const workPeriod = `${year}-${String(month + 1).padStart(2, "0")}`;
    return submittedPeriods.includes(workPeriod);
  };

  return {
    submittedPeriods,
    loading: isLoading,
    error: error instanceof Error ? error : error ? new Error("Failed to fetch submitted periods") : null,
    refetch,
    isAlreadySubmitted,
    isMonthSubmitted,
  };
}
