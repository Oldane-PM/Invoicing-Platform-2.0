/**
 * useSubmissionActions Hook
 *
 * Provides mutations for manager submission actions (approve, reject, respond to clarification).
 * Uses React Query mutations with automatic cache invalidation.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  approveSubmission,
  rejectSubmission,
  markSubmissionPaid,
  respondToClarification,
} from "../../supabase/repos/managerSubmissions.repo";
import { useAuth } from "../useAuth";
import { MANAGER_SUBMISSIONS_QUERY_KEY } from "./useManagerSubmissions";
import { MANAGER_SUBMISSION_DETAILS_QUERY_KEY } from "./useSubmissionDetails";

/**
 * Hook for approving a submission (Manager action)
 * Transitions: PENDING_MANAGER -> AWAITING_ADMIN_PAYMENT
 */
export function useManagerApprove() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (submissionId: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      await approveSubmission(submissionId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MANAGER_SUBMISSIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [MANAGER_SUBMISSION_DETAILS_QUERY_KEY] });
      toast.success("Submission approved");
    },
    onError: (error: Error) => {
      console.error("[useManagerApprove] Error:", error);
      toast.error(error.message || "Failed to approve submission");
    },
  });
}

/**
 * Hook for bulk approving submissions (Manager action)
 * Transitions: PENDING_MANAGER -> AWAITING_ADMIN_PAYMENT
 */
export function useManagerBulkApprove() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (submissionIds: string[]) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      const results = {
        successful: [] as string[],
        failed: [] as { id: string; error: string }[],
      };

      for (const id of submissionIds) {
        try {
          await approveSubmission(id, user.id);
          results.successful.push(id);
        } catch (error: any) {
          results.failed.push({ id, error: error.message || "Unknown error" });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: [MANAGER_SUBMISSIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [MANAGER_SUBMISSION_DETAILS_QUERY_KEY] });
      
      if (results.failed.length === 0) {
        toast.success(`Successfully approved ${results.successful.length} submissions`);
      } else if (results.successful.length > 0) {
        toast.warning(`Approved ${results.successful.length} submissions, but ${results.failed.length} failed`);
      } else {
        toast.error(`Failed to approve ${results.failed.length} submissions`);
      }
    },
    onError: (error: Error) => {
      console.error("[useManagerBulkApprove] Error:", error);
      toast.error(error.message || "Failed to process bulk approval");
    },
  });
}

/**
 * Hook for rejecting a submission (Manager action)
 * Transitions: PENDING_MANAGER -> REJECTED_CONTRACTOR
 */
export function useManagerReject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ submissionId, reason }: { submissionId: string; reason: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      await rejectSubmission(submissionId, user.id, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MANAGER_SUBMISSIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [MANAGER_SUBMISSION_DETAILS_QUERY_KEY] });
      toast.success("Submission rejected");
    },
    onError: (error: Error) => {
      console.error("[useManagerReject] Error:", error);
      toast.error(error.message || "Failed to reject submission");
    },
  });
}

/**
 * Hook for marking a submission as paid (Manager action - legacy)
 */
export function useManagerMarkPaid() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (submissionId: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      await markSubmissionPaid(submissionId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MANAGER_SUBMISSIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [MANAGER_SUBMISSION_DETAILS_QUERY_KEY] });
      toast.success("Submission marked as paid");
    },
    onError: (error: Error) => {
      console.error("[useManagerMarkPaid] Error:", error);
      toast.error(error.message || "Failed to mark as paid");
    },
  });
}

/**
 * Hook for responding to admin clarification request (Manager action)
 * Transitions:
 *   - RESUBMIT: CLARIFICATION_REQUESTED -> AWAITING_ADMIN_PAYMENT
 *   - REJECT_TO_CONTRACTOR: CLARIFICATION_REQUESTED -> REJECTED_CONTRACTOR
 */
export function useManagerRespondClarification() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      submissionId,
      action,
      note,
    }: {
      submissionId: string;
      action: "RESUBMIT" | "REJECT_TO_CONTRACTOR";
      note: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      await respondToClarification(submissionId, user.id, action, note);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [MANAGER_SUBMISSIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [MANAGER_SUBMISSION_DETAILS_QUERY_KEY] });
      
      if (variables.action === "RESUBMIT") {
        toast.success("Response sent to admin");
      } else {
        toast.success("Submission rejected to contractor");
      }
    },
    onError: (error: Error) => {
      console.error("[useManagerRespondClarification] Error:", error);
      toast.error(error.message || "Failed to respond to clarification");
    },
  });
}

// Legacy compatibility export - combines all actions into one hook
// Prefer using individual hooks above for better tree-shaking
export function useSubmissionActions() {
  const approveMutation = useManagerApprove();
  const rejectMutation = useManagerReject();
  const markPaidMutation = useManagerMarkPaid();
  const respondClarificationMutation = useManagerRespondClarification();
  const bulkApproveMutation = useManagerBulkApprove();

  return {
    approving: { loading: approveMutation.isPending, error: approveMutation.error },
    rejecting: { loading: rejectMutation.isPending, error: rejectMutation.error },
    markingPaid: { loading: markPaidMutation.isPending, error: markPaidMutation.error },
    respondingClarification: { loading: respondClarificationMutation.isPending, error: respondClarificationMutation.error },
    bulkApproving: { loading: bulkApproveMutation.isPending, error: bulkApproveMutation.error },
    approve: async (submissionId: string) => {
      try {
        await approveMutation.mutateAsync(submissionId);
        return true;
      } catch {
        return false;
      }
    },
    bulkApprove: async (submissionIds: string[]) => {
      try {
        const results = await bulkApproveMutation.mutateAsync(submissionIds);
        return results;
      } catch {
        return { successful: [], failed: submissionIds.map(id => ({ id, error: "Failed to process bulk approval" })) };
      }
    },
    reject: async (submissionId: string, reason: string) => {
      try {
        await rejectMutation.mutateAsync({ submissionId, reason });
        return true;
      } catch {
        return false;
      }
    },
    markPaid: async (submissionId: string) => {
      try {
        await markPaidMutation.mutateAsync(submissionId);
        return true;
      } catch {
        return false;
      }
    },
    respondClarification: async (
      submissionId: string,
      action: "RESUBMIT" | "REJECT_TO_CONTRACTOR",
      note: string
    ) => {
      try {
        await respondClarificationMutation.mutateAsync({ submissionId, action, note });
        return true;
      } catch {
        return false;
      }
    },
  };
}
