/**
 * useContractorProfile Hook
 * 
 * Manages loading and saving contractor profile data (Personal + Banking).
 * Uses React Query for caching and automatic state management.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../useAuth";
import {
  getFullContractorProfile,
  upsertContractorProfile,
  type ContractorProfileData,
  type ContractInfo,
  type ContractorProfilePatch,
} from "../../supabase/repos/contractorProfile.repo";

// Query key constant
export const CONTRACTOR_PROFILE_QUERY_KEY = "contractorProfile";

export interface UseContractorProfileResult {
  // Data
  profile: ContractorProfileData | null;
  contract: ContractInfo | null;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  
  // Error state
  error: Error | null;
  
  // Actions
  saveProfile: (patch: ContractorProfilePatch) => Promise<{ ok: boolean; error?: string; profile?: ContractorProfileData }>;
  reload: () => void;
}

export function useContractorProfile(): UseContractorProfileResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  // Fetch profile data
  const {
    data,
    isLoading,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: [CONTRACTOR_PROFILE_QUERY_KEY, userId],
    queryFn: async () => {
      if (!userId) throw new Error("No user ID");
      return getFullContractorProfile(userId);
    },
    enabled: !!userId,
    staleTime: 60000, // 1 minute
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (patch: ContractorProfilePatch) => {
      if (!userId) throw new Error("No user ID");
      return upsertContractorProfile(userId, patch);
    },
    onSuccess: (newProfile) => {
      console.log("[useContractorProfile] Save successful, updating cache:", newProfile.user_id);
      // Update the cache with new data immediately
      queryClient.setQueryData(
        [CONTRACTOR_PROFILE_QUERY_KEY, userId],
        (old: { profile: ContractorProfileData; contract: ContractInfo | null } | undefined) => ({
          profile: newProfile,
          contract: old?.contract || null,
        })
      );
      // Also invalidate to ensure consistency on next visit
      queryClient.invalidateQueries({ queryKey: [CONTRACTOR_PROFILE_QUERY_KEY, userId] });
    },
    onError: (error) => {
      console.error("[useContractorProfile] Save failed:", error);
    },
  });

  // Save function that returns a result and the updated profile
  const saveProfile = async (patch: ContractorProfilePatch): Promise<{ ok: boolean; error?: string; profile?: ContractorProfileData }> => {
    try {
      const newProfile = await saveMutation.mutateAsync(patch);
      return { ok: true, profile: newProfile };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save profile";
      return { ok: false, error: errorMessage };
    }
  };

  return {
    profile: data?.profile || null,
    contract: data?.contract || null,
    isLoading,
    isSaving: saveMutation.isPending,
    error: fetchError instanceof Error ? fetchError : null,
    saveProfile,
    reload: () => refetch(),
  };
}
