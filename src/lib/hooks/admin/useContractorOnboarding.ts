/**
 * useContractorOnboarding Hook (admin, read-only)
 *
 * Lets an admin view a specific contractor's onboarding data (signed work order
 * + entered contract details + invoice sequence) for review, via Supabase. The
 * admin RLS policies on contractor_profiles / vendor_work_orders / storage allow
 * the read.
 */

import { useQuery } from "@tanstack/react-query";
import { isSupabaseConfigured } from "../../supabase/client";
import {
  getVendorOnboarding,
  getWorkOrderRef,
  type VendorOnboardingData,
  type WorkOrderRef,
} from "../../data/vendorOnboarding";

const QUERY_KEY = "contractorOnboarding";

export interface UseContractorOnboardingResult {
  data: VendorOnboardingData | null;
  isLoading: boolean;
  error: Error | null;
  getWorkOrderUrl: (path: string, filename: string | null) => Promise<WorkOrderRef>;
}

export function useContractorOnboarding(
  contractorId: string | null | undefined
): UseContractorOnboardingResult {
  const { data, isLoading, error } = useQuery({
    queryKey: [QUERY_KEY, contractorId],
    queryFn: async (): Promise<VendorOnboardingData> => {
      return getVendorOnboarding(contractorId as string);
    },
    enabled: !!contractorId && isSupabaseConfigured,
    staleTime: 30_000,
  });

  const getWorkOrderUrl = async (path: string, filename: string | null) => {
    return getWorkOrderRef(path, filename);
  };

  return {
    data: data ?? null,
    isLoading,
    error: error instanceof Error ? error : null,
    getWorkOrderUrl,
  };
}
