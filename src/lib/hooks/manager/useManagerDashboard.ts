/**
 * useManagerDashboard Hook
 *
 * Provides dashboard metrics and recent submissions for the Manager portal.
 * Uses repos for data access - NEVER imports supabase client directly.
 */

import { useState, useEffect, useCallback } from "react";
import {
  getDashboardMetrics,
  getRecentSubmissions,
  type DashboardMetrics,
  type RecentSubmission,
} from "../../supabase/repos/managerDashboard.repo";
import { useAuth } from "../useAuth";

interface UseManagerDashboardResult {
  metrics: DashboardMetrics | null;
  recentSubmissions: RecentSubmission[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useManagerDashboard(): UseManagerDashboardResult {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [metricsData, submissionsData] = await Promise.all([
        getDashboardMetrics(user.id),
        getRecentSubmissions(user.id, 5),
      ]);

      setMetrics(metricsData);
      setRecentSubmissions(submissionsData);
    } catch (err) {
      console.error("[useManagerDashboard] Error fetching dashboard:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch dashboard data"));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    metrics,
    recentSubmissions,
    loading,
    error,
    refetch: fetchDashboard,
  };
}
