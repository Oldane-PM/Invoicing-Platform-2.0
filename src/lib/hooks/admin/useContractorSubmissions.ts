/**
 * useContractorSubmissions Hook
 *
 * Fetches submissions for a specific contractor.
 * Used in the Admin Entry Directory > Contractor Detail Drawer.
 */

import { useQuery } from "@tanstack/react-query";
import { listContractorSubmissions } from "../../supabase/repos/submissions.repo";

export function useContractorSubmissions(contractorId: string | undefined) {
  return useQuery({
    queryKey: ["contractorSubmissions", contractorId],
    queryFn: async () => {
      if (!contractorId) return [];
      return listContractorSubmissions(contractorId);
    },
    enabled: !!contractorId,
  });
}
