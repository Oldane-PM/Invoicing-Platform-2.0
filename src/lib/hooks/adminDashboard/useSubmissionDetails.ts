/**
 * useSubmissionDetails Hook
 * 
 * Fetches detailed submission information using React Query
 */

import { useQuery } from '@tanstack/react-query';
import { getSubmissionDetails } from '../../data/adminDashboard';

export function useSubmissionDetails(submissionId: string | null) {
  return useQuery({
    queryKey: ['admin', 'submission', submissionId],
    queryFn: () => getSubmissionDetails(submissionId!),
    enabled: !!submissionId,
    staleTime: 10000, // 10 seconds
    retry: 2,
  });
}
