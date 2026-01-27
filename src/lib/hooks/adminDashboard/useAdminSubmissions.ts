/**
 * useAdminSubmissions Hook
 * 
 * Fetches admin submissions with filtering using React Query
 */

import { useQuery } from '@tanstack/react-query';
import { getSubmissions, getProjects, getManagers } from '../../data/adminDashboard';
import type { SubmissionFilters } from '../../data/adminDashboard';

export function useAdminSubmissions(filters: SubmissionFilters = {}) {
  return useQuery({
    queryKey: ['admin', 'submissions', filters],
    queryFn: () => getSubmissions(filters),
    staleTime: 10000, // 10 seconds
    retry: 2,
  });
}

export function useProjects() {
  return useQuery({
    queryKey: ['admin', 'projects'],
    queryFn: getProjects,
    staleTime: 60000, // 1 minute (projects don't change often)
    retry: 2,
  });
}

export function useManagers() {
  return useQuery({
    queryKey: ['admin', 'managers'],
    queryFn: getManagers,
    staleTime: 60000, // 1 minute (managers don't change often)
    retry: 2,
  });
}
