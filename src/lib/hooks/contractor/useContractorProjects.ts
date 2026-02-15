/**
 * useContractorProjects Hook
 *
 * Provides list of projects assigned to the current contractor.
 * Used for the project dropdown in Submit Hours page.
 */

import { useQuery } from "@tanstack/react-query";
import { listContractorAssignedProjects } from "../../supabase/repos/projectAssignments.repo";
import { getSupabaseClient } from "../../supabase/client";
import type { ContractorProject } from "../../types";
import { QUERY_KEYS } from "../queryKeys";

interface UseContractorProjectsResult {
  projects: ContractorProject[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  hasProjects: boolean;
}

export function useContractorProjects(): UseContractorProjectsResult {
  // Get current user ID from Supabase auth
  const supabase = getSupabaseClient();

  const query = useQuery({
    queryKey: [QUERY_KEYS.CONTRACTOR_PROJECTS],
    queryFn: async () => {
      // Get the current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error("[useContractorProjects] Auth error:", authError.message);
        throw new Error("Failed to get current user");
      }
      
      if (!user) {
        console.error("[useContractorProjects] No authenticated user");
        return [];
      }

      // Fetch projects assigned to this contractor
      return listContractorAssignedProjects(user.id);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    projects: query.data || [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    hasProjects: (query.data?.length || 0) > 0,
  };
}
