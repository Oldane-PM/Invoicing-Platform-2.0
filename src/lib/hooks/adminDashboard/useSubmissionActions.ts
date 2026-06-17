/**
 * useSubmissionActions Hook
 * 
 * Provides mutations for admin submission actions.
 * 
 * NOTE: Admin can ONLY take action after Manager approval:
 * - Mark as Paid (after manager approved)
 * - Request Clarification from Manager (after manager approved)
 * 
 * Approve/Reject are handled by Manager, not Admin.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  requestClarification,
  markPaid,
} from '../../data/adminDashboard';
import type {
  RequestClarificationParams,
  MarkPaidParams,
} from '../../data/adminDashboard';

export function useRequestClarification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: RequestClarificationParams) => requestClarification(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'submissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'submission'] });
      toast.success('Clarification requested from manager');
    },
    onError: (error: Error) => {
      console.error('Failed to request clarification:', error);
      toast.error(error.message || 'Failed to request clarification. Please try again.');
    },
  });
}

export function useMarkPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: MarkPaidParams) => markPaid(params),
    onSuccess: () => {
      // Invalidate Admin queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'submissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'submission'] });
      
      // Invalidate Manager queries for cross-portal sync
      queryClient.invalidateQueries({ queryKey: ['managerSubmissions'] });
      queryClient.invalidateQueries({ queryKey: ['managerSubmissionDetails'] });
      
      // Invalidate Contractor queries for cross-portal sync
      queryClient.invalidateQueries({ queryKey: ['contractorSubmissions'] });
      
      toast.success('Submission marked as paid');
    },
    onError: (error: Error) => {
      console.error('Failed to mark submission as paid:', error);
      toast.error(error.message || 'Failed to mark as paid. Please try again.');
    },
  });
}

export function useBulkMarkPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ submissionIds, adminUserId }: { submissionIds: string[], adminUserId: string }) => {
      const results = {
        successful: [] as string[],
        failed: [] as { id: string; error: string }[],
      };

      for (const id of submissionIds) {
        try {
          await markPaid({ submissionId: id, adminUserId });
          results.successful.push(id);
        } catch (error: any) {
          results.failed.push({ id, error: error.message || "Unknown error" });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      // Invalidate Admin queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'submissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'submission'] });
      
      // Invalidate Manager queries for cross-portal sync
      queryClient.invalidateQueries({ queryKey: ['managerSubmissions'] });
      queryClient.invalidateQueries({ queryKey: ['managerSubmissionDetails'] });
      
      // Invalidate Contractor queries for cross-portal sync
      queryClient.invalidateQueries({ queryKey: ['contractorSubmissions'] });
      
      if (results.failed.length === 0) {
        toast.success(`Successfully marked ${results.successful.length} submissions as paid`);
      } else if (results.successful.length > 0) {
        toast.warning(`Marked ${results.successful.length} as paid, but ${results.failed.length} failed`);
      } else {
        toast.error(`Failed to mark ${results.failed.length} submissions as paid`);
      }
    },
    onError: (error: Error) => {
      console.error('Failed to process bulk payment:', error);
      toast.error(error.message || 'Failed to process bulk payment. Please try again.');
    },
  });
}
