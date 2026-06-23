/**
 * useTeam Hook
 *
 * Provides team management functionality for Manager portal.
 * Uses React Query for caching and mutations.
 */

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  listAllContractors,
  type TeamContractor,
  type AvailableContractor,
} from "../../supabase/repos/team.repo";
import { useAuth } from "../useAuth";

// Query keys for cache invalidation
export const MANAGER_TEAM_KEY = "managerTeam";
export const MANAGER_AVAILABLE_CONTRACTORS_KEY = "managerAvailableContractors";

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
  const managerId = user?.id ?? null;

  // Fetch all contractors on the platform
  const teamQuery = useQuery({
    queryKey: [MANAGER_TEAM_KEY],
    queryFn: async () => {
      const contractorsData = await listAllContractors();
      return { contractors: contractorsData, size: contractorsData.length };
    },
    enabled: !!managerId,
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  // Fetch available contractors - dummy implementation since not used
  const fetchAvailable = useCallback(async () => {}, []);
  const searchAvailable = useCallback(async (_query: string) => {}, []);

  // Add to team wrapper - dummy implementation
  const addToTeam = useCallback(async (_contractorId: string): Promise<boolean> => true, []);

  // Remove from team wrapper - dummy implementation
  const removeFromTeam = useCallback(async (_contractorId: string): Promise<boolean> => true, []);

  const refetch = async () => {
    await teamQuery.refetch();
  };

  return {
    // Team list
    contractors: teamQuery.data?.contractors ?? [],
    teamSize: teamQuery.data?.size ?? 0,
    loading: teamQuery.isLoading,
    error: teamQuery.error instanceof Error ? teamQuery.error : teamQuery.error ? new Error("Failed to fetch team") : null,
    refetch,

    // Available contractors (dummies)
    availableContractors: [],
    availableLoading: false,
    availableError: null,
    fetchAvailable,
    searchAvailable,

    // Actions (dummies)
    addToTeam,
    removeFromTeam,
    adding: false,
    removing: false,
    actionError: null,
  };
}

