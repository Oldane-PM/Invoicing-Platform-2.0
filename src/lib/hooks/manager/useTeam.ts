/**
 * useTeam Hook
 *
 * Provides team management functionality for Manager portal.
 * Uses repos for data access - NEVER imports supabase client directly.
 */

import { useState, useEffect, useCallback } from "react";
import {
  listTeamContractors,
  getTeamSize,
  getAvailableContractors,
  searchAvailableContractors,
  addContractorToTeam,
  removeContractorFromTeam,
  type TeamContractor,
  type AvailableContractor,
} from "../../supabase/repos/team.repo";
import { useAuth } from "../useAuth";

interface UseTeamResult {
  // Team list
  contractors: TeamContractor[];
  teamSize: number;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;

  // Available contractors (for add dialog)
  availableContractors: AvailableContractor[];
  availableLoading: boolean;
  availableError: Error | null;
  fetchAvailable: () => Promise<void>;
  searchAvailable: (query: string) => Promise<void>;

  // Actions
  addToTeam: (contractorId: string) => Promise<boolean>;
  removeFromTeam: (contractorId: string) => Promise<boolean>;
  adding: boolean;
  removing: boolean;
  actionError: Error | null;
}

export function useTeam(): UseTeamResult {
  const { user } = useAuth();

  // Team list state
  const [contractors, setContractors] = useState<TeamContractor[]>([]);
  const [teamSize, setTeamSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Available contractors state
  const [availableContractors, setAvailableContractors] = useState<AvailableContractor[]>([]);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [availableError, setAvailableError] = useState<Error | null>(null);

  // Action states
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [actionError, setActionError] = useState<Error | null>(null);

  // Fetch team
  const fetchTeam = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [contractorsData, sizeData] = await Promise.all([
        listTeamContractors(user.id),
        getTeamSize(user.id),
      ]);

      setContractors(contractorsData);
      setTeamSize(sizeData);
    } catch (err) {
      console.error("[useTeam] Error fetching team:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch team"));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  // Fetch available contractors (not in team)
  const fetchAvailable = useCallback(async () => {
    if (!user?.id) return;

    setAvailableLoading(true);
    setAvailableError(null);

    try {
      const data = await getAvailableContractors(user.id);
      setAvailableContractors(data);
    } catch (err) {
      console.error("[useTeam] Error fetching available contractors:", err);
      setAvailableError(
        err instanceof Error ? err : new Error("Failed to fetch contractors")
      );
    } finally {
      setAvailableLoading(false);
    }
  }, [user?.id]);

  // Search available contractors
  const searchAvailable = useCallback(
    async (query: string) => {
      if (!user?.id) return;

      setAvailableLoading(true);
      setAvailableError(null);

      try {
        const data = await searchAvailableContractors(user.id, query);
        setAvailableContractors(data);
      } catch (err) {
        console.error("[useTeam] Error searching contractors:", err);
        setAvailableError(
          err instanceof Error ? err : new Error("Search failed")
        );
      } finally {
        setAvailableLoading(false);
      }
    },
    [user?.id]
  );

  // Add contractor to team
  const addToTeam = useCallback(
    async (contractorId: string): Promise<boolean> => {
      if (!user?.id) {
        setActionError(new Error("Not authenticated"));
        return false;
      }

      setAdding(true);
      setActionError(null);

      try {
        await addContractorToTeam(user.id, contractorId);
        // Refetch team and available contractors
        await Promise.all([fetchTeam(), fetchAvailable()]);
        return true;
      } catch (err) {
        console.error("[useTeam] Error adding contractor:", err);
        setActionError(
          err instanceof Error ? err : new Error("Failed to add contractor")
        );
        return false;
      } finally {
        setAdding(false);
      }
    },
    [user?.id, fetchTeam, fetchAvailable]
  );

  // Remove contractor from team
  const removeFromTeam = useCallback(
    async (contractorId: string): Promise<boolean> => {
      if (!user?.id) {
        setActionError(new Error("Not authenticated"));
        return false;
      }

      setRemoving(true);
      setActionError(null);

      try {
        await removeContractorFromTeam(user.id, contractorId);
        // Refetch team
        await fetchTeam();
        return true;
      } catch (err) {
        console.error("[useTeam] Error removing contractor:", err);
        setActionError(
          err instanceof Error ? err : new Error("Failed to remove contractor")
        );
        return false;
      } finally {
        setRemoving(false);
      }
    },
    [user?.id, fetchTeam]
  );

  return {
    // Team list
    contractors,
    teamSize,
    loading,
    error,
    refetch: fetchTeam,

    // Available contractors
    availableContractors,
    availableLoading,
    availableError,
    fetchAvailable,
    searchAvailable,

    // Actions
    addToTeam,
    removeFromTeam,
    adding,
    removing,
    actionError,
  };
}
