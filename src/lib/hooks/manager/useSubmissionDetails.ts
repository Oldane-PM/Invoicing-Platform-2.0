/**
 * useSubmissionDetails Hook
 *
 * Provides detailed submission data for a single submission.
 * Uses repos for data access - NEVER imports supabase client directly.
 */

import { useState, useEffect, useCallback } from "react";
import {
  getSubmissionDetails,
  type ManagerSubmission,
} from "../../supabase/repos/managerSubmissions.repo";
import { useAuth } from "../useAuth";

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
  const [submission, setSubmission] = useState<ManagerSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSubmission = useCallback(async () => {
    if (!user?.id || !submissionId) {
      setSubmission(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getSubmissionDetails(submissionId, user.id);
      setSubmission(data);
    } catch (err) {
      console.error("[useSubmissionDetails] Error fetching submission:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch submission details"));
    } finally {
      setLoading(false);
    }
  }, [user?.id, submissionId]);

  useEffect(() => {
    fetchSubmission();
  }, [fetchSubmission]);

  return {
    submission,
    loading,
    error,
    refetch: fetchSubmission,
  };
}
