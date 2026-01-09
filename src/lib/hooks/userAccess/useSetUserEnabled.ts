/**
 * useSetUserEnabled Hook
 * 
 * React Query mutation hook for enabling/disabling users with optimistic updates.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { setUserEnabled } from '../../data/userAccess';
import type { UserAccessUser } from '../../data/userAccess';
import { toast } from 'sonner';

interface SetUserEnabledParams {
  userId: string;
  isActive: boolean;
  userName: string; // For toast message
}

export function useSetUserEnabled() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, isActive }: SetUserEnabledParams) =>
      setUserEnabled(userId, isActive),
    
    // Optimistic update
    onMutate: async ({ userId, isActive }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['userAccess', 'users'] });

      // Snapshot previous value
      const previousUsers = queryClient.getQueryData<UserAccessUser[]>(['userAccess', 'users']);

      // Optimistically update
      queryClient.setQueryData<UserAccessUser[]>(['userAccess', 'users'], (old) =>
        old?.map((user) =>
          user.id === userId ? { ...user, isActive } : user
        ) ?? []
      );

      return { previousUsers };
    },

    // Rollback on error
    onError: (error, _variables, context) => {
      console.error('[useSetUserEnabled] Error:', error);
      if (context?.previousUsers) {
        queryClient.setQueryData(['userAccess', 'users'], context.previousUsers);
      }
      toast.error('Failed to update user status. Please try again.');
    },

    // Success toast
    onSuccess: (_, variables) => {
      if (variables.isActive) {
        toast.success(`Access enabled for ${variables.userName}`);
      } else {
        toast(`Access disabled for ${variables.userName}`, {
          description: 'User will no longer be able to access the platform',
        });
      }
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['userAccess', 'users'] });
    },
  });
}
