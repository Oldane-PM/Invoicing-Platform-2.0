/**
 * useUserAccessUsers Hook
 * 
 * React Query hook to fetch all users for User Access Management.
 */

import { useQuery } from '@tanstack/react-query';
import { getUsers } from '../../data/userAccess';

export function useUserAccessUsers() {
  return useQuery({
    queryKey: ['userAccess', 'users'],
    queryFn: getUsers,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}
