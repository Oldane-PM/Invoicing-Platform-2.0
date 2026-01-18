/**
 * useManagerDashboard Hook
 *
 * Provides dashboard metrics and recent submissions for the Manager portal.
 * Uses React Query for caching and automatic invalidation.
 */

import { useQuery } from "@tanstack/react-query";
import {
  getDashboardMetrics,
  getRecentSubmissions,
  type DashboardMetrics,
  type RecentSubmission,
} from "../../supabase/repos/managerDashboard.repo";
import { useAuth } from "../useAuth";

// Query keys for cache invalidation
export const MANAGER_DASHBOARD_METRICS_KEY = "managerDashboardMetrics";
export const MANAGER_DASHBOARD_SUBMISSIONS_KEY = "managerDashboardSubmissions";

interface UseManagerDashboardResult {
  metrics: DashboardMetrics | null;
  recentSubmissions: RecentSubmission[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useManagerDashboard(): UseManagerDashboardResult {
  const { user } = useAuth();
  const managerId = user?.id ?? null;

  // Fetch metrics
  const metricsQuery = useQuery({
    queryKey: [MANAGER_DASHBOARD_METRICS_KEY, managerId],
    queryFn: async () => {
      if (!managerId) return null;
      return getDashboardMetrics(managerId);
    },
    enabled: !!managerId,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  // Fetch recent submissions
  const submissionsQuery = useQuery({
    queryKey: [MANAGER_DASHBOARD_SUBMISSIONS_KEY, managerId],
    queryFn: async () => {
      if (!managerId) return [];
      return getRecentSubmissions(managerId, 5);
    },
    enabled: !!managerId,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  const refetch = async () => {
    await Promise.all([metricsQuery.refetch(), submissionsQuery.refetch()]);
  };

  const loading = metricsQuery.isLoading || submissionsQuery.isLoading;
  const error = metricsQuery.error || submissionsQuery.error;

  return {
    metrics: metricsQuery.data ?? null,
    recentSubmissions: submissionsQuery.data ?? [],
    loading,
    error: error instanceof Error ? error : error ? new Error("Failed to fetch dashboard data") : null,
    refetch,
  };
}
