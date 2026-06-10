/**
 * useDeleteUser Hook
 * 
 * React Query mutation hook for deleting users with optimistic updates.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteUser } from '../../data/userAccess';
import type { UserAccessUser } from '../../data/userAccess';
import { toast } from 'sonner';

interface DeleteUserParams {
  userId: string;
  userName: string; // For toast message
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId }: DeleteUserParams) =>
      deleteUser(userId),
    
    // Optimistic update - remove user from list
    onMutate: async ({ userId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['userAccess', 'users'] });

      // Snapshot previous value
      const previousUsers = queryClient.getQueryData<UserAccessUser[]>(['userAccess', 'users']);

      // Optimistically remove user from list
      queryClient.setQueryData<UserAccessUser[]>(['userAccess', 'users'], (old) =>
        old?.filter((user) => user.id !== userId) ?? []
      );

      return { previousUsers };
    },

    // Rollback on error
    onError: (error, _variables, context) => {
      console.error('[useDeleteUser] Error:', error);
      if (context?.previousUsers) {
        queryClient.setQueryData(['userAccess', 'users'], context.previousUsers);
      }
      toast.error(error instanceof Error ? error.message : 'Failed to delete user. Please try again.');
    },

    // Success toast
    onSuccess: (_, variables) => {
      toast.success(`${variables.userName} has been deleted`, {
        description: 'The user has been permanently removed from the system',
      });
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['userAccess', 'users'] });
    },
  });
}
