/**
 * useAvailableContractors Hook
 *
 * Manages the state for searching and listing available contractors
 * to be added to a manager's team.
 */

import { useState, useCallback } from "react";
import {
  getAvailableContractors,
  searchContractors,
  type AvailableContractor,
} from "../../supabase/repos/team.repo";
import { useAuth } from "../useAuth";

interface UseAvailableContractorsResult {
  availableContractors: AvailableContractor[];
  loading: boolean;
  error: Error | null;
  fetchAvailable: () => Promise<void>;
  searchAvailable: (query: string) => Promise<void>;
}

export function useAvailableContractors(): UseAvailableContractorsResult {
  const { user } = useAuth();
  const [availableContractors, setAvailableContractors] = useState<AvailableContractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAvailable = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getAvailableContractors(user.id);
      setAvailableContractors(data);
    } catch (err) {
      console.error("[useAvailableContractors] Error fetching contractors:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch contractors"));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const searchAvailable = useCallback(async (query: string) => {
    if (!user?.id) return;

    // specific check: if query is empty, revert to fetchAll
    if (!query.trim()) {
      await fetchAvailable();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await searchContractors(user.id, query);
      setAvailableContractors(data);
    } catch (err) {
      console.error("[useAvailableContractors] Error searching contractors:", err);
      setError(err instanceof Error ? err : new Error("Search failed"));
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchAvailable]);

  return {
    availableContractors,
    loading,
    error,
    fetchAvailable,
    searchAvailable,
  };
}
