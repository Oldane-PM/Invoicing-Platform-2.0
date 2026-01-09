/**
 * useUpdateUserRole Hook
 * 
 * React Query mutation hook for updating user roles with optimistic updates.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUserRole } from '../../data/userAccess';
import type { UserRole, UserAccessUser } from '../../data/userAccess';
import { toast } from 'sonner';

interface UpdateUserRoleParams {
  userId: string;
  role: UserRole;
  userName: string; // For toast message
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: UpdateUserRoleParams) =>
      updateUserRole(userId, role),
    
    // Optimistic update
    onMutate: async ({ userId, role }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['userAccess', 'users'] });

      // Snapshot previous value
      const previousUsers = queryClient.getQueryData<UserAccessUser[]>(['userAccess', 'users']);

      // Optimistically update
      queryClient.setQueryData<UserAccessUser[]>(['userAccess', 'users'], (old) =>
        old?.map((user) =>
          user.id === userId ? { ...user, role } : user
        ) ?? []
      );

      return { previousUsers };
    },

    // Rollback on error
    onError: (error, _variables, context) => {
      console.error('[useUpdateUserRole] Error:', error);
      if (context?.previousUsers) {
        queryClient.setQueryData(['userAccess', 'users'], context.previousUsers);
      }
      toast.error('Failed to update role. Please try again.');
    },

    // Success toast
    onSuccess: (_, variables) => {
      toast.success(`Role updated to ${variables.role} for ${variables.userName}`);
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['userAccess', 'users'] });
    },
  });
}
