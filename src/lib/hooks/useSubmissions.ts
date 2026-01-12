/**
 * useSubmissions Hook
 *
 * Provides state management for loading and displaying contractor submissions.
 * Uses the data source abstraction for flexibility.
 */

import { useState, useEffect, useCallback } from "react";
import type { ContractorSubmission } from "../types";
import { getSubmissionsDataSource } from "../data/submissionsDataSource";
import { useAuth } from "./useAuth";

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

  // Get auth state to ensure we only fetch when logged in
  const { user } = useAuth();
  
  const fetchSubmissions = useCallback(async () => {
    // specific check: don't fetch if no user
    if (!user) {
      setLoading(false);
      return;
    }

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
  }, [user]);

  // Fetch when user changes (and exists)
  useEffect(() => {
    if (user) {
      fetchSubmissions();
    } else {
      setLoading(false); 
    }
  }, [user, fetchSubmissions]);

  return {
    submissions,
    loading,
    error,
    refetch: fetchSubmissions,
  };
}
