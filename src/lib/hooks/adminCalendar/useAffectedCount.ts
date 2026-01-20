/**
 * useAffectedCount Hook
 * 
 * Fetches the affected contractor count based on scope configuration.
 * Used in the Add/Edit Time Off drawer to show how many people will be affected.
 */

import { useQuery } from '@tanstack/react-query';
import { getAffectedContractorCount, getTotalContractorCount } from '../../data/adminCalendar';
import type { TimeOffScopeType } from '../../data/adminCalendar';

interface UseAffectedCountParams {
  scopeType: TimeOffScopeType;
  scopeRoles: string[];
  enabled?: boolean;
}

/**
 * Hook to get the count of contractors affected by a time-off scope
 */
export function useAffectedCount({ scopeType, scopeRoles, enabled = true }: UseAffectedCountParams) {
  return useQuery({
    queryKey: ['adminCalendar', 'affectedCount', scopeType, scopeRoles],
    queryFn: () => getAffectedContractorCount(scopeType, scopeRoles),
    enabled,
    staleTime: 30 * 1000, // 30 seconds - counts change less frequently
  });
}

/**
 * Hook to get the total contractor count (for ALL scope display)
 */
export function useTotalContractorCount() {
  return useQuery({
    queryKey: ['adminCalendar', 'totalContractorCount'],
    queryFn: getTotalContractorCount,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
