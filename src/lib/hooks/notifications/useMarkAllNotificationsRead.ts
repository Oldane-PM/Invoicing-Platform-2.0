/**
 * Mark All Notifications Read Hook
 * 
 * React Query mutation hook for marking all notifications as read.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markAllAsRead } from '../../data/notifications';

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllAsRead(),
    onSuccess: () => {
      // Invalidate all notification queries
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
