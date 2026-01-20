/**
 * useUpdateContractInfo Hook
 *
 * Mutation hook for updating contract information.
 * Handles cache invalidation for both Employee Directory and Contractor Profile.
 *
 * ARCHITECTURE: UI → Hooks → Repos → Supabase
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateContractInfo } from "../../data/contractInfo";
import type { ContractInfoUpdatePayload } from "../../data/contractInfo";
import { QUERY_KEYS } from "../queryKeys";

export function useUpdateContractInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ContractInfoUpdatePayload) => updateContractInfo(payload),
    onSuccess: (data, variables) => {
      console.log("[useUpdateContractInfo] Contract info updated, invalidating caches");

      // Invalidate Employee Directory cache (admin view)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EMPLOYEE_DIRECTORY] });

      // Invalidate Contractor Profile cache (contractor view)
      // Use the contractor_id from the update to invalidate the specific profile
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.CONTRACTOR_PROFILE, variables.contractor_id],
      });

      // Also invalidate any broader contractor queries
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CONTRACTORS] });
    },
    onError: (error) => {
      console.error("[useUpdateContractInfo] Update failed:", error);
    },
  });
}
