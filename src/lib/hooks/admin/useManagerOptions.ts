/**
 * useManagerOptions Hook
 * 
 * Provides manager options for selection in admin contract editing.
 * Uses react-query for caching and state management.
 */

import { useQuery } from "@tanstack/react-query";
import { getManagerOptions } from "../../data/adminManagers";

export function useManagerOptions() {
  return useQuery({
    queryKey: ["admin", "managerOptions"],
    queryFn: getManagerOptions,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}
