/**
 * useSubmissionActions Hook
 * 
 * Provides mutations for admin submission actions (approve, reject, clarify, pay)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  approveSubmission,
  rejectSubmission,
  requestClarification,
  markPaid,
} from '../../data/adminDashboard';
import type {
  ApproveSubmissionParams,
  RejectSubmissionParams,
  RequestClarificationParams,
  MarkPaidParams,
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
