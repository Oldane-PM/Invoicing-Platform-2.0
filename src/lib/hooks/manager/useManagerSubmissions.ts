/**
 * useManagerSubmissions Hook
 *
 * Provides team submissions list with filtering for Manager portal.
 * Uses repos for data access - NEVER imports supabase client directly.
 */

import { useState, useEffect, useCallback } from "react";
import {
  listTeamSubmissions,
  type ManagerSubmission,
  type SubmissionFilters,
} from "../../supabase/repos/managerSubmissions.repo";
import { useAuth } from "../useAuth";

interface UseManagerSubmissionsResult {
  submissions: ManagerSubmission[];
  loading: boolean;
  error: Error | null;
  filters: SubmissionFilters;
  setFilters: (filters: SubmissionFilters) => void;
  refetch: () => Promise<void>;
}

export function useManagerSubmissions(
  initialFilters: SubmissionFilters = {}
): UseManagerSubmissionsResult {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<ManagerSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<SubmissionFilters>(initialFilters);

  const fetchSubmissions = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await listTeamSubmissions(user.id, filters);
      setSubmissions(data);
    } catch (err) {
      console.error("[useManagerSubmissions] Error fetching submissions:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch submissions"));
    } finally {
      setLoading(false);
    }
  }, [user?.id, filters]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  return {
    submissions,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchSubmissions,
  };
}
