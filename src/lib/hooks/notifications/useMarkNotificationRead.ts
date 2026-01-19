/**
 * Mark Notification Read Hook
 * 
 * React Query mutation hook for marking a notification as read.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markAsRead } from '../../data/notifications';
import type { Notification } from '../../data/notifications';

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => markAsRead(notificationId),
    onMutate: async (notificationId) => {
      console.log('[useMarkNotificationRead] Optimistically updating notification:', notificationId);
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      // Snapshot previous values
      const previousNotifications = queryClient.getQueryData(['notifications']);
      const previousCount = queryClient.getQueryData(['notifications', 'unreadCount']);

      // Optimistically update notifications list
      queryClient.setQueriesData(
        { queryKey: ['notifications'], exact: false },
        (old: any) => {
          // Type guard: ensure old is an array before mapping
          if (!old || !Array.isArray(old)) return old;
          return old.map((notification: Notification) =>
            notification.id === notificationId
              ? { ...notification, isRead: true }
              : notification
          );
        }
      );

      // Optimistically update unread count
      queryClient.setQueryData(
        ['notifications', 'unreadCount'],
        (old: number | undefined) => Math.max(0, (old || 0) - 1)
      );

      return { previousNotifications, previousCount };
    },
    onError: (err, _notificationId, context) => {
      console.error('[useMarkNotificationRead] Error marking notification as read:', err);
      
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications'], context.previousNotifications);
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(['notifications', 'unreadCount'], context.previousCount);
      }
    },
    onSuccess: (_data, notificationId) => {
      console.log('[useMarkNotificationRead] Successfully marked notification as read:', notificationId);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
