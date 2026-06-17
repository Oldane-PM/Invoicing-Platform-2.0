/**
 * useVendorOnboarding Hook
 *
 * Loads/saves the current contractor's onboarding data and signed work order via
 * Supabase. Requires an authenticated session (the demo login now creates a real
 * session — see App.tsx + migration 054).
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../useAuth";
import { isSupabaseConfigured } from "../../supabase/client";
import {
  getVendorOnboarding,
  saveVendorOnboarding,
  uploadWorkOrder,
  getWorkOrderRef,
  type VendorOnboardingData,
  type VendorOnboardingPatch,
  type WorkOrderRef,
} from "../../data/vendorOnboarding";

const QUERY_KEY = "vendorOnboarding";

export interface UseVendorOnboardingResult {
  data: VendorOnboardingData | null;
  isLoading: boolean;
  isSaving: boolean;
  isUploading: boolean;
  error: Error | null;
  saveOnboarding: (
    patch: VendorOnboardingPatch
  ) => Promise<{ ok: boolean; error?: string; data?: VendorOnboardingData }>;
  uploadWorkOrderFile: (
    file: File
  ) => Promise<{ ok: boolean; error?: string; data?: VendorOnboardingData }>;
  getWorkOrderUrl: (path: string, filename: string | null) => Promise<WorkOrderRef>;
  reload: () => void;
}

export function useVendorOnboarding(): UseVendorOnboardingResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const queryKey = [QUERY_KEY, userId];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async (): Promise<VendorOnboardingData> => {
      if (!userId) throw new Error("No user ID");
      return getVendorOnboarding(userId);
    },
    enabled: !!userId && isSupabaseConfigured,
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: async (patch: VendorOnboardingPatch): Promise<VendorOnboardingData> => {
      if (!userId) throw new Error("No user ID");
      return saveVendorOnboarding(userId, patch);
    },
    onSuccess: (next) => {
      queryClient.setQueryData(queryKey, next);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File): Promise<VendorOnboardingData> => {
      if (!userId) throw new Error("No user ID");
      const result = await uploadWorkOrder(userId, file);
      return saveVendorOnboarding(userId, {
        work_order_path: result.path,
        work_order_filename: result.filename,
        work_order_uploaded_at: result.uploadedAt,
      });
    },
    onSuccess: (next) => {
      queryClient.setQueryData(queryKey, next);
    },
  });

  const saveOnboarding = async (patch: VendorOnboardingPatch) => {
    try {
      const saved = await saveMutation.mutateAsync(patch);
      return { ok: true, data: saved };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to save onboarding",
      };
    }
  };

  const uploadWorkOrderFile = async (file: File) => {
    try {
      const saved = await uploadMutation.mutateAsync(file);
      return { ok: true, data: saved };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to upload work order",
      };
    }
  };

  const getWorkOrderUrl = async (path: string, filename: string | null) => {
    return getWorkOrderRef(path, filename);
  };

  return {
    data: data ?? null,
    isLoading,
    isSaving: saveMutation.isPending,
    isUploading: uploadMutation.isPending,
    error: error instanceof Error ? error : null,
    saveOnboarding,
    uploadWorkOrderFile,
    getWorkOrderUrl,
    reload: () => {
      void refetch();
    },
  };
}
