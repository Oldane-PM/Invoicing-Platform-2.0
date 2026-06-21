import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase/client";
import {
  createWorkOrder,
  getAdminWorkOrders,
  getContractorWorkOrders,
  getWorkOrderById,
  signWorkOrderContractor,
  signWorkOrderFinance,
} from "../supabase/repos/systemWorkOrders.repo";
import { toast } from "sonner";

export function useAdminWorkOrders() {
  return useQuery({
    queryKey: ["admin_work_orders"],
    queryFn: () => getAdminWorkOrders(supabase!),
  });
}

export function useContractorWorkOrders(contractorUserId: string | undefined) {
  return useQuery({
    queryKey: ["contractor_work_orders", contractorUserId],
    queryFn: () => {
      if (!contractorUserId) return [];
      return getContractorWorkOrders(contractorUserId, supabase!);
    },
    enabled: !!contractorUserId,
  });
}

export function useWorkOrder(id: string | null) {
  return useQuery({
    queryKey: ["work_order", id],
    queryFn: () => {
      if (!id) return null;
      return getWorkOrderById(id, supabase!);
    },
    enabled: !!id,
  });
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof createWorkOrder>[0]) => createWorkOrder(data, supabase!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_work_orders"] });
      toast.success("Work order generated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to generate work order");
    },
  });
}

export function useSignWorkOrderContractor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; signatureName: string; signatureData: string }) =>
      signWorkOrderContractor(params.id, params.signatureName, params.signatureData, supabase!),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contractor_work_orders"] });
      queryClient.invalidateQueries({ queryKey: ["work_order", variables.id] });
      toast.success("Work order signed successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to sign work order");
    },
  });
}

export function useSignWorkOrderFinance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; signatureName: string; signatureData: string }) =>
      signWorkOrderFinance(params.id, params.signatureName, params.signatureData, supabase!),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin_work_orders"] });
      queryClient.invalidateQueries({ queryKey: ["work_order", variables.id] });
      toast.success("Work order counter-signed successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to sign work order");
    },
  });
}
