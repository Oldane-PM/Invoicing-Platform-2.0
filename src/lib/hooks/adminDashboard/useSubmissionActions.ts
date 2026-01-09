/**
 * useSubmissionActions Hook
 * 
 * Provides mutations for submission actions (approve, reject, clarify)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  approveSubmission,
  rejectSubmission,
  requestClarification,
} from '../../data/adminDashboard';
import type {
  ApproveSubmissionParams,
  RejectSubmissionParams,
  RequestClarificationParams,
} from '../../data/adminDashboard';

export function useApproveSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ApproveSubmissionParams) => approveSubmission(params),
    onSuccess: () => {
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['admin', 'submissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'submission'] });
      toast.success('Submission approved successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to approve submission:', error);
      toast.error('Failed to approve submission. Please try again.');
    },
  });
}

export function useRejectSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: RejectSubmissionParams) => rejectSubmission(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'submissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'submission'] });
      toast.success('Submission rejected');
    },
    onError: (error: Error) => {
      console.error('Failed to reject submission:', error);
      toast.error('Failed to reject submission. Please try again.');
    },
  });
}

export function useRequestClarification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: RequestClarificationParams) => requestClarification(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'submissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'submission'] });
      toast.success('Clarification requested');
    },
    onError: (error: Error) => {
      console.error('Failed to request clarification:', error);
      toast.error('Failed to request clarification. Please try again.');
    },
  });
}
