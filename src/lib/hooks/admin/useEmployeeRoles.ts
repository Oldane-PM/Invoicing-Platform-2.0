/**
 * useEmployeeRoles Hook
 *
 * Provides unique employee roles for selectors and filters.
 * Uses react-query for caching and deduplication.
 */

import { useQuery } from "@tanstack/react-query";
import { getUniqueRoles } from "../../supabase/repos/employeeDirectory.repo";

interface UseEmployeeRolesResult {
  roles: string[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const EMPLOYEE_ROLES_QUERY_KEY = ["employeeRoles"] as const;

/**
 * Hook to get unique employee/contractor roles
 * Useful for role-based filtering and selection in admin features
 */
export function useEmployeeRoles(): UseEmployeeRolesResult {
  const query = useQuery({
    queryKey: EMPLOYEE_ROLES_QUERY_KEY,
    queryFn: getUniqueRoles,
    staleTime: 10 * 60 * 1000, // 10 minutes - roles don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  return {
    roles: query.data || [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
