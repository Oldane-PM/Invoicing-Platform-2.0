/**
 * useAdminMetrics Hook
 * 
 * Fetches admin dashboard metrics using React Query
 */

import { useQuery } from '@tanstack/react-query';
import { getAdminMetrics } from '../../data/adminDashboard';

export function useAdminMetrics() {
  return useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: getAdminMetrics,
    staleTime: 30000, // 30 seconds
    retry: 2,
  });
}
