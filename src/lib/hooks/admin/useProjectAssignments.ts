/**
 * useProjectAssignments Hook
 *
 * Provides project assignment management for admin users.
 * Uses react-query for caching and state management.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listProjectContractors,
  assignContractorToProject,
  removeContractorFromProject,
  assignManagerToProject,
  removeManagerFromProject,
  listAvailableContractors,
  listAvailableManagers,
} from "../../supabase/repos/projectAssignments.repo";
import { getProjectById } from "../../supabase/repos/projects.repo";
import type { ProjectContractor } from "../../types";
import { QUERY_KEYS } from "../queryKeys";

interface ManagerInfo {
  id: string;
  fullName: string;
  email: string;
}

interface AvailableUser {
  id: string;
  fullName: string;
  email: string;
}

interface UseProjectAssignmentsResult {
  // Assigned contractors
  contractors: ProjectContractor[];
  contractorsLoading: boolean;
  contractorsError: Error | null;

  // Available contractors (not yet assigned)
  availableContractors: AvailableUser[];
  availableContractorsLoading: boolean;

  // Manager assignment
  manager: ManagerInfo | null;
  managerLoading: boolean;

  // Available managers
  availableManagers: AvailableUser[];
  availableManagersLoading: boolean;

  // Mutations
  assignContractor: (contractorId: string) => Promise<void>;
  removeContractor: (contractorId: string) => Promise<void>;
  assignManager: (managerId: string) => Promise<void>;
  removeManager: () => Promise<void>;

  // Mutation states
  assigning: boolean;
  removing: boolean;
  assigningManager: boolean;
  removingManager: boolean;
}

export function useProjectAssignments(projectId: string): UseProjectAssignmentsResult {
  const queryClient = useQueryClient();

  // Fetch assigned contractors
  const contractorsQuery = useQuery({
    queryKey: [QUERY_KEYS.PROJECT_ASSIGNMENTS, projectId, "contractors"],
    queryFn: () => listProjectContractors(projectId),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch available contractors
  const availableContractorsQuery = useQuery({
    queryKey: [QUERY_KEYS.PROJECT_ASSIGNMENTS, projectId, "availableContractors"],
    queryFn: () => listAvailableContractors(projectId),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch project to get manager info
  const projectQuery = useQuery({
    queryKey: [QUERY_KEYS.ADMIN_PROJECTS, projectId],
    queryFn: () => getProjectById(projectId),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch available managers
  const availableManagersQuery = useQuery({
    queryKey: [QUERY_KEYS.MANAGERS],
    queryFn: () => listAvailableManagers(),
    staleTime: 5 * 60 * 1000,
  });

  // Assign contractor mutation
  const assignContractorMutation = useMutation({
    mutationFn: (contractorId: string) => assignContractorToProject(projectId, contractorId),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PROJECT_ASSIGNMENTS, projectId],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ADMIN_PROJECTS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.CONTRACTOR_PROJECTS],
      });
    },
    onError: (error: Error) => {
      console.error("[useProjectAssignments] assignContractor error:", error.message);
    },
  });

  // Remove contractor mutation
  const removeContractorMutation = useMutation({
    mutationFn: (contractorId: string) => removeContractorFromProject(projectId, contractorId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PROJECT_ASSIGNMENTS, projectId],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ADMIN_PROJECTS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.CONTRACTOR_PROJECTS],
      });
    },
    onError: (error: Error) => {
      console.error("[useProjectAssignments] removeContractor error:", error.message);
    },
  });

  // Assign manager mutation
  const assignManagerMutation = useMutation({
    mutationFn: (managerId: string) => assignManagerToProject(projectId, managerId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ADMIN_PROJECTS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PROJECT_ASSIGNMENTS, projectId],
      });
    },
    onError: (error: Error) => {
      console.error("[useProjectAssignments] assignManager error:", error.message);
    },
  });

  // Remove manager mutation
  const removeManagerMutation = useMutation({
    mutationFn: () => removeManagerFromProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ADMIN_PROJECTS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PROJECT_ASSIGNMENTS, projectId],
      });
    },
    onError: (error: Error) => {
      console.error("[useProjectAssignments] removeManager error:", error.message);
    },
  });

  // Extract manager info from project
  const manager: ManagerInfo | null = projectQuery.data?.managerId
    ? {
        id: projectQuery.data.managerId,
        fullName: projectQuery.data.managerName || "Unknown",
        email: projectQuery.data.managerEmail || "",
      }
    : null;

  return {
    // Contractors
    contractors: contractorsQuery.data || [],
    contractorsLoading: contractorsQuery.isLoading,
    contractorsError: contractorsQuery.error as Error | null,

    // Available contractors
    availableContractors: availableContractorsQuery.data || [],
    availableContractorsLoading: availableContractorsQuery.isLoading,

    // Manager
    manager,
    managerLoading: projectQuery.isLoading,

    // Available managers
    availableManagers: availableManagersQuery.data || [],
    availableManagersLoading: availableManagersQuery.isLoading,

    // Mutation functions
    assignContractor: assignContractorMutation.mutateAsync,
    removeContractor: removeContractorMutation.mutateAsync,
    assignManager: assignManagerMutation.mutateAsync,
    removeManager: removeManagerMutation.mutateAsync,

    // Mutation states
    assigning: assignContractorMutation.isPending,
    removing: removeContractorMutation.isPending,
    assigningManager: assignManagerMutation.isPending,
    removingManager: removeManagerMutation.isPending,
  };
}
