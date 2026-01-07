/**
 * useCreateSubmission Hook
 *
 * Provides state management for creating a new submission.
 * Uses the data source abstraction for flexibility.
 */

import { useState, useCallback } from "react";
import type { ContractorSubmission, SubmissionDraft } from "../types";
import { getSubmissionsDataSource } from "../data/submissionsDataSource";

interface UseCreateSubmissionResult {
  create: (draft: SubmissionDraft) => Promise<ContractorSubmission | null>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useCreateSubmission(): UseCreateSubmissionResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (draft: SubmissionDraft): Promise<ContractorSubmission | null> => {
    setLoading(true);
    setError(null);

    try {
      const dataSource = getSubmissionsDataSource();
      const newSubmission = await dataSource.createSubmission(draft);
      return newSubmission;
    } catch (err) {
      console.error("[useCreateSubmission] Error creating submission:", err);
      const error = err instanceof Error ? err : new Error("Failed to create submission");
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setLoading(false);
  }, []);

  return {
    create,
    loading,
    error,
    reset,
  };
}
