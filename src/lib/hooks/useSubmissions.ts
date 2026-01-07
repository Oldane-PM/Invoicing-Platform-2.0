/**
 * useSubmissions Hook
 *
 * Provides state management for loading and displaying contractor submissions.
 * Uses the data source abstraction for flexibility.
 */

import { useState, useEffect, useCallback } from "react";
import type { ContractorSubmission } from "../types";
import { getSubmissionsDataSource } from "../data/submissionsDataSource";

interface UseSubmissionsResult {
  submissions: ContractorSubmission[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSubmissions(): UseSubmissionsResult {
  const [submissions, setSubmissions] = useState<ContractorSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const dataSource = getSubmissionsDataSource();
      const data = await dataSource.listMySubmissions();
      setSubmissions(data);
    } catch (err) {
      console.error("[useSubmissions] Error fetching submissions:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch submissions"));
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  return {
    submissions,
    loading,
    error,
    refetch: fetchSubmissions,
  };
}
