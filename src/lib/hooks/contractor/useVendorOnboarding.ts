/**
 * useVendorOnboarding Hook
 *
 * Loads/saves the current contractor's onboarding data and signed work order via
 * Supabase. Requires an authenticated session (the demo login now creates a real
 * session — see App.tsx + migration 054).
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "../useAuth";
import { isSupabaseConfigured, getSupabaseClient } from "../../supabase/client";
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
const API_BASE_URL = (import.meta.env.VITE_AUTH_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5001").replace(/\/+$/, "");

export interface UseVendorOnboardingResult {
  data: VendorOnboardingData | null;
  isLoading: boolean;
  isSaving: boolean;
  isUploading: boolean;
  isExtracting: boolean;
  error: Error | null;
  saveOnboarding: (
    patch: VendorOnboardingPatch
  ) => Promise<{ ok: boolean; error?: string; data?: VendorOnboardingData }>;
  uploadWorkOrderFile: (
    file: File
  ) => Promise<{ ok: boolean; error?: string; data?: VendorOnboardingData }>;
  getWorkOrderUrl: (path: string, filename: string | null) => Promise<WorkOrderRef>;
  extractWorkOrder: (storagePath: string) => Promise<{
    ok: boolean;
    error?: string;
    data?: {
      role: string | null;
      rate: number | null;
      rateType: "hourly" | "fixed" | null;
      startDate: string | null;
      endDate: string | null;
      isValid?: boolean;
      reasons?: string[];
      validationStatus?: string;
      validationDetails?: any;
      personalInfo?: any;
    };
  }>;
  extractPreviousInvoice: (storagePath: string) => Promise<{
    ok: boolean;
    error?: string;
    data?: {
      bankName: string | null;
      bankAddress: string | null;
      swiftCode: string | null;
      routingNumber: string | null;
      accountType: 'Checking' | 'Savings' | null;
      currency: string | null;
      accountNumber: string | null;
      invoiceNumber: string | null;
    };
  }>;
  reload: () => void;
}

export function useVendorOnboarding(): UseVendorOnboardingResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const [isExtracting, setIsExtracting] = useState(false);

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

  const extractWorkOrder = async (storagePath: string) => {
    setIsExtracting(true);
    try {
      let token = null;
      try {
        const client = getSupabaseClient();
        const sessionResponse = await client.auth.getSession();
        token = sessionResponse?.data?.session?.access_token;
      } catch (e) {
        console.warn("Could not get Supabase session token:", e);
      }

      const response = await fetch(`${API_BASE_URL}/api/work-order/extract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ storagePath }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Failed to extract details",
        }));
        throw new Error(errorData.error || "Failed to extract details from work order");
      }

      const responseData = await response.json();
      return { ok: true, data: responseData.data };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to extract work order details",
      };
    } finally {
      setIsExtracting(false);
    }
  };

  const extractPreviousInvoice = async (storagePath: string) => {
    setIsExtracting(true);
    try {
      let token = null;
      try {
        const client = getSupabaseClient();
        const sessionResponse = await client.auth.getSession();
        token = sessionResponse?.data?.session?.access_token;
      } catch (e) {
        console.warn("Could not get Supabase session token:", e);
      }

      const response = await fetch(`${API_BASE_URL}/api/work-order/extract-invoice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ storagePath }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Failed to extract details",
        }));
        throw new Error(errorData.error || "Failed to extract details from invoice");
      }

      const responseData = await response.json();
      return { ok: true, data: responseData.data };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to extract invoice details",
      };
    } finally {
      setIsExtracting(false);
    }
  };

  return {
    data: data ?? null,
    isLoading,
    isSaving: saveMutation.isPending,
    isUploading: uploadMutation.isPending,
    isExtracting,
    error: error instanceof Error ? error : null,
    saveOnboarding,
    uploadWorkOrderFile,
    getWorkOrderUrl,
    extractWorkOrder,
    extractPreviousInvoice,
    reload: () => {
      void refetch();
    },
  };
}
