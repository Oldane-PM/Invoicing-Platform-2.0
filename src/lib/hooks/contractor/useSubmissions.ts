/**
 * useSubmissions Hook
 *
 * Provides state management for loading and displaying contractor submissions.
 * Uses React Query for caching and automatic invalidation after mutations.
 *
 * FETCH BEHAVIOR:
 * - Fetches once per userId change
 * - Caches for 30 seconds (staleTime)
 * - Does NOT refetch on window focus or mount (prevents loops)
 * - Deduplicates concurrent requests via React Query
 */

import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef } from "react";
import type { ContractorSubmission } from "../../types";
import { getSubmissionsDataSource } from "../../data/submissionsDataSource";
import { useAuth } from "../useAuth";
import { isSupabaseConfigured } from "../../supabase/client";

// Query key constants - export for use in mutations
export const SUBMISSIONS_QUERY_KEY = "contractorSubmissions";

interface UseSubmissionsResult {
  submissions: ContractorSubmission[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSubmissions(): UseSubmissionsResult {
  const { user } = useAuth();

  // Derive stable userId to prevent unnecessary query key changes
  const userId = user?.id ?? null;

  // Track last fetched userId to log only on actual fetches
  const lastFetchedUserIdRef = useRef<string | null>(null);

  // Memoize queryKey to ensure stability
  const queryKey = useMemo(
    () => [SUBMISSIONS_QUERY_KEY, userId] as const,
    [userId]
  );

  const {
    data: submissions = [],
    isLoading,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        throw new Error("Supabase is not configured");
      }

      // Only log if this is a new fetch (not a cache hit)
      if (lastFetchedUserIdRef.current !== userId) {
        console.log("[useSubmissions] Fetching for user:", userId);
        lastFetchedUserIdRef.current = userId;
      }

      try {
        const dataSource = getSubmissionsDataSource();
        return await dataSource.listMySubmissions();
      } catch (err) {
        // Log the full error for debugging
        console.error("[useSubmissions] Fetch failed:", err);
        // Re-throw with preserved message
        if (err instanceof Error) {
          throw err;
        }
        throw new Error(String(err) || "Failed to fetch submissions");
      }
    },
    // Only enable query when we have a valid user and Supabase is configured
    enabled: !!userId && isSupabaseConfigured,
    // Cache for 30 seconds before considering stale
    staleTime: 30000,
    // Cache persists for 5 minutes even when component unmounts
    gcTime: 300000,
    // Prevent refetch on window focus (major cause of loops)
    refetchOnWindowFocus: false,
    // Prevent refetch when component remounts with same data
    refetchOnMount: false,
    // Prevent automatic refetch on reconnect
    refetchOnReconnect: false,
    // Only retry once on error
    retry: 1,
  });

  const refetch = async () => {
    // Reset tracking so we log on manual refetch
    lastFetchedUserIdRef.current = null;
    await queryRefetch();
  };

  return {
    submissions,
    loading: isLoading,
    error: error instanceof Error ? error : error ? new Error("Failed to fetch submissions") : null,
    refetch,
  };
}
