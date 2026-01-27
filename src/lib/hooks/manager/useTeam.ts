/**
 * useTeam Hook
 *
 * Provides team management functionality for Manager portal.
 * Uses React Query for caching and mutations.
 */

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listTeamContractors,
  getTeamSize,
  getAvailableContractors,
  searchContractors,
  addContractorToTeam,
  removeContractorFromTeam,
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
  const queryClient = useQueryClient();
  const managerId = user?.id ?? null;

  // Search query state (for available contractors search)
  const [searchQuery, setSearchQuery] = useState<string | null>(null);

  // Fetch team contractors
  const teamQuery = useQuery({
    queryKey: [MANAGER_TEAM_KEY, managerId],
    queryFn: async () => {
      if (!managerId) return { contractors: [] as TeamContractor[], size: 0 };
      const [contractorsData, sizeData] = await Promise.all([
        listTeamContractors(managerId),
        getTeamSize(managerId),
      ]);
      return { contractors: contractorsData, size: sizeData };
    },
    enabled: !!managerId,
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  // Fetch available contractors
  const availableQuery = useQuery({
    queryKey: [MANAGER_AVAILABLE_CONTRACTORS_KEY, managerId, searchQuery],
    queryFn: async () => {
      if (!managerId) return [];
      if (searchQuery) {
        return searchContractors(managerId, searchQuery);
      }
      return getAvailableContractors(managerId);
    },
    enabled: false, // Only fetch on demand
    staleTime: 30000,
    gcTime: 300000,
    retry: 1,
  });

  // Add contractor mutation
  const addMutation = useMutation({
    mutationFn: async (contractorId: string) => {
      if (!managerId) throw new Error("Not authenticated");
      await addContractorToTeam(managerId, contractorId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MANAGER_TEAM_KEY] });
      queryClient.invalidateQueries({ queryKey: [MANAGER_AVAILABLE_CONTRACTORS_KEY] });
      toast.success("Contractor added to team");
    },
    onError: (error: Error) => {
      console.error("[useTeam] Error adding contractor:", error);
      toast.error(error.message || "Failed to add contractor");
    },
  });

  // Remove contractor mutation
  const removeMutation = useMutation({
    mutationFn: async (contractorId: string) => {
      if (!managerId) throw new Error("Not authenticated");
      await removeContractorFromTeam(managerId, contractorId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MANAGER_TEAM_KEY] });
      queryClient.invalidateQueries({ queryKey: [MANAGER_AVAILABLE_CONTRACTORS_KEY] });
      toast.success("Contractor removed from team");
    },
    onError: (error: Error) => {
      console.error("[useTeam] Error removing contractor:", error);
      toast.error(error.message || "Failed to remove contractor");
    },
  });

  // Fetch available contractors
  const fetchAvailable = useCallback(async () => {
    setSearchQuery(null);
    await availableQuery.refetch();
  }, [availableQuery]);

  // Search available contractors
  const searchAvailable = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      await availableQuery.refetch();
    },
    [availableQuery]
  );

  // Add to team wrapper
  const addToTeam = useCallback(
    async (contractorId: string): Promise<boolean> => {
      try {
        await addMutation.mutateAsync(contractorId);
        return true;
      } catch {
        return false;
      }
    },
    [addMutation]
  );

  // Remove from team wrapper
  const removeFromTeam = useCallback(
    async (contractorId: string): Promise<boolean> => {
      try {
        await removeMutation.mutateAsync(contractorId);
        return true;
      } catch {
        return false;
      }
    },
    [removeMutation]
  );

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

    // Available contractors
    availableContractors: availableQuery.data ?? [],
    availableLoading: availableQuery.isFetching,
    availableError: availableQuery.error instanceof Error ? availableQuery.error : availableQuery.error ? new Error("Failed to fetch contractors") : null,
    fetchAvailable,
    searchAvailable,

    // Actions
    addToTeam,
    removeFromTeam,
    adding: addMutation.isPending,
    removing: removeMutation.isPending,
    actionError: addMutation.error ?? removeMutation.error ?? null,
  };
}
